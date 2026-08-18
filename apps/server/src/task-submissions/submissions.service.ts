import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PointsService } from '../points/points.service';
import { ActivitiesService } from '../activities/activities.service';
import { ErrorCode } from '../common/exceptions';
import { PointsType } from '../common/enums';
import { SubmitTaskDto, RejectTaskDto } from './dto';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
    private readonly activities: ActivitiesService,
  ) {}

  async submit(childUserId: string, instanceId: string, dto: SubmitTaskDto) {
    const instance = await this.prisma.taskInstance.findUnique({
      where: { id: instanceId },
      include: { task: true },
    });
    if (!instance) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.TASK_NOT_FOUND,
        message: '任务实例不存在',
      });
    }
    if (instance.childId !== childUserId) {
      throw new ForbiddenException({
        success: false,
        code: ErrorCode.FORBIDDEN,
        message: '不能提交他人的任务',
      });
    }
    if (instance.status === 'APPROVED') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.TASK_ALREADY_APPROVED,
        message: '该任务已通过，无需重复提交',
      });
    }
    if (instance.status === 'EXPIRED' || instance.status === 'CANCELLED') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.TASK_EXPIRED,
        message: '任务已过期或已取消',
      });
    }
    if (instance.status !== 'PENDING' && instance.status !== 'REJECTED') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INVALID_TASK_STATUS,
        message: '当前状态不能提交',
      });
    }
    if (instance.task.requireTextProof && !dto.textProof) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INVALID_TASK_STATUS,
        message: '该任务要求填写文字说明',
      });
    }
    if (instance.task.requireImageProof && (!dto.images || dto.images.length === 0)) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INVALID_TASK_STATUS,
        message: '该任务要求上传完成照片',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.taskSubmission.create({
        data: {
          taskInstanceId: instance.id,
          childId: childUserId,
          textProof: dto.textProof,
          status: 'PENDING',
        },
      });
      if (dto.images && dto.images.length) {
        await tx.taskSubmissionImage.createMany({
          data: dto.images.map((url) => ({ submissionId: submission.id, url })),
        });
      }
      await tx.taskInstance.update({
        where: { id: instance.id },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      });
      return { message: '提交成功', submissionId: submission.id };
    });
    await this.activities.recordByUser(instance!.childId, instance!.task.parentId, {
      type: 'TASK_SUBMITTED',
      text: `提交了「${instance!.task.title}」`,
      status: 'SUBMITTED',
      refType: 'TASK',
      refId: instanceId,
    });
  }

  async listReviews(parentId: string) {
    return this.prisma.taskInstance.findMany({
      where: { status: 'SUBMITTED', task: { parentId } },
      include: {
        task: true,
        submissions: { orderBy: { createdAt: 'desc' }, take: 1, include: { images: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async approve(parentId: string, instanceId: string) {
    const instance = await this.prisma.taskInstance.findUnique({
      where: { id: instanceId },
      include: { task: true },
    });
    if (!instance) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.TASK_NOT_FOUND,
        message: '任务实例不存在',
      });
    }
    if (instance.task.parentId !== parentId) {
      throw new ForbiddenException({
        success: false,
        code: ErrorCode.FORBIDDEN,
        message: '不能审核其他家长的任务',
      });
    }
    if (instance.status === 'APPROVED') {
      return { message: '已通过', instanceId };
    }
    if (instance.status !== 'SUBMITTED') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INVALID_TASK_STATUS,
        message: '仅待审核任务可以通过',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const inst = await tx.taskInstance.update({
        where: { id: instanceId },
        data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: parentId },
      });
      const latest = await tx.taskSubmission.findFirst({
        where: { taskInstanceId: instanceId },
        orderBy: { createdAt: 'desc' },
      });
      if (latest) {
        await tx.taskSubmission.update({
          where: { id: latest.id },
          data: { status: 'APPROVED' },
        });
      }
      // 发放积分（幂等：同一任务实例只发一次）
      await this.points.award(
        tx,
        instance.childId,
        instance.task.rewardPoints,
        PointsType.TASK_REWARD,
        'TASK_REWARD',
        instanceId,
        `TASK_REWARD:${instanceId}`,
        `完成 ${instance.task.title}`,
      );
      return inst;
    });

    await this.activities.recordByUser(instance!.childId, parentId, {
      type: 'TASK_DONE',
      text: `完成「${instance!.task.title}」`,
      status: 'APPROVED',
      refType: 'TASK',
      refId: instanceId,
    });
    return { message: '已通过，积分已发放', instanceId: updated.id };
  }

  async reject(parentId: string, instanceId: string, dto: RejectTaskDto) {
    const instance = await this.prisma.taskInstance.findUnique({
      where: { id: instanceId },
      include: { task: true },
    });
    if (!instance) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.TASK_NOT_FOUND,
        message: '任务实例不存在',
      });
    }
    if (instance.task.parentId !== parentId) {
      throw new ForbiddenException({
        success: false,
        code: ErrorCode.FORBIDDEN,
        message: '不能审核其他家长的任务',
      });
    }
    if (instance.status !== 'SUBMITTED') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INVALID_TASK_STATUS,
        message: '仅待审核任务可以驳回',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.taskInstance.update({
        where: { id: instanceId },
        data: { status: 'REJECTED', reviewedAt: new Date(), reviewedBy: parentId },
      });
      const latest = await tx.taskSubmission.findFirst({
        where: { taskInstanceId: instanceId },
        orderBy: { createdAt: 'desc' },
      });
      if (latest) {
        await tx.taskSubmission.update({
          where: { id: latest.id },
          data: { status: 'REJECTED', rejectReason: dto.reason },
        });
      }
    });
    await this.activities.recordByUser(instance!.childId, parentId, {
      type: 'TASK_REJECTED',
      text: `「${instance!.task.title}」未通过，需重新提交`,
      status: 'REJECTED',
      refType: 'TASK',
      refId: instanceId,
    });
    return { message: '已驳回', instanceId };
  }
}
