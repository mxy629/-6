import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ErrorCode } from '../common/exceptions';
import { CreateTaskDto, UpdateTaskDto } from './dto';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function combineDateAndTime(date: Date, time?: string): Date | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertChildOwned(parentId: string, childUserId: string) {
    const profile = await this.prisma.childProfile.findUnique({
      where: { userId: childUserId },
    });
    if (!profile || profile.parentUserId !== parentId) {
      throw new ForbiddenException({
        success: false,
        code: ErrorCode.CHILD_NOT_FOUND,
        message: '孩子不存在或不属于当前家长',
      });
    }
    return profile;
  }

  async create(parentId: string, dto: CreateTaskDto) {
    await this.assertChildOwned(parentId, dto.childId);

    const start = dto.startDate ? startOfDay(new Date(dto.startDate)) : startOfDay(new Date());
    const repeat = dto.repeatType || 'NONE';

    const dates: Date[] = [];
    if ((repeat === 'DAILY' || repeat === 'WEEKLY') && dto.endDate) {
      const end = startOfDay(new Date(dto.endDate));
      const step = repeat === 'WEEKLY' ? 7 : 1;
      let cursor = new Date(start);
      let guard = 0;
      while (cursor <= end && guard < 200) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + step);
        guard++;
      }
    } else {
      dates.push(start);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          parentId,
          childId: dto.childId,
          title: dto.title,
          description: dto.description,
          rewardPoints: dto.rewardPoints,
          taskType: dto.taskType || 'OTHER',
          repeatType: repeat,
          startDate: start,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          deadlineTime: dto.deadlineTime,
          requireTextProof: dto.requireTextProof || false,
          requireImageProof: dto.requireImageProof || false,
          status: 'ACTIVE',
        },
      });

      await tx.taskInstance.createMany({
        data: dates.map((date) => ({
          taskId: task.id,
          childId: dto.childId,
          date,
          deadlineAt: combineDateAndTime(date, dto.deadlineTime),
          status: 'PENDING',
        })),
      });

      return task;
    });

    return this.findOneForParent(parentId, created.id);
  }

  async findAllForParent(parentId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { parentId, status: { not: 'DELETED' } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { instances: true } } },
    });
    return tasks.map((t) => ({ ...t, instanceCount: t._count.instances }));
  }

  async findOneForParent(parentId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, parentId, status: { not: 'DELETED' } },
    });
    if (!task) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.TASK_NOT_FOUND,
        message: '任务不存在',
      });
    }
    const instances = await this.prisma.taskInstance.findMany({
      where: { taskId },
      orderBy: { date: 'asc' },
    });
    return { ...task, instances };
  }

  async update(parentId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.findOneForParent(parentId, taskId);
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.rewardPoints !== undefined) data.rewardPoints = dto.rewardPoints;
    if (dto.taskType !== undefined) data.taskType = dto.taskType;
    if (dto.deadlineTime !== undefined) data.deadlineTime = dto.deadlineTime;
    if (dto.requireTextProof !== undefined) data.requireTextProof = dto.requireTextProof;
    if (dto.requireImageProof !== undefined) data.requireImageProof = dto.requireImageProof;

    return this.prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id: taskId }, data });
      // 同步更新尚未开始的实例
      if (dto.rewardPoints !== undefined || dto.deadlineTime !== undefined) {
        const pending = await tx.taskInstance.findMany({
          where: { taskId, status: 'PENDING' },
        });
        for (const inst of pending) {
          await tx.taskInstance.update({
            where: { id: inst.id },
            data: {
              ...(dto.rewardPoints !== undefined ? { status: 'PENDING' } : {}),
            },
          });
        }
        if (dto.deadlineTime !== undefined) {
          await tx.taskInstance.updateMany({
            where: { taskId, status: 'PENDING' },
            data: { deadlineAt: combineDateAndTime(new Date(), dto.deadlineTime) },
          });
        }
      }
      return this.findOneForParent(parentId, taskId);
    });
  }

  async remove(parentId: string, taskId: string) {
    await this.findOneForParent(parentId, taskId);
    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id: taskId }, data: { status: 'CANCELLED' } });
      await tx.taskInstance.updateMany({
        where: { taskId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
    });
    return { message: '任务已取消' };
  }

  async childToday(childUserId: string) {
    const today = startOfDay(new Date());
    return this.prisma.taskInstance.findMany({
      where: { childId: childUserId, date: today, status: { not: 'CANCELLED' } },
      include: { task: true },
      orderBy: { deadlineAt: 'asc' },
    });
  }

  async childAll(childUserId: string) {
    return this.prisma.taskInstance.findMany({
      where: { childId: childUserId, status: { not: 'CANCELLED' } },
      include: { task: true },
      orderBy: { date: 'desc' },
    });
  }

  async childInstanceDetail(childUserId: string, instanceId: string) {
    const inst = await this.prisma.taskInstance.findFirst({
      where: { id: instanceId, childId: childUserId },
      include: {
        task: true,
        submissions: { orderBy: { createdAt: 'desc' }, include: { images: true } },
      },
    });
    if (!inst) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.TASK_NOT_FOUND,
        message: '任务实例不存在',
      });
    }
    return inst;
  }
}
