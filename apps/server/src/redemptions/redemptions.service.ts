import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PointsService } from '../points/points.service';
import { ActivitiesService } from '../activities/activities.service';
import { ErrorCode } from '../common/exceptions';
import { PointsType } from '../common/enums';

@Injectable()
export class RedemptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
    private readonly activities: ActivitiesService,
  ) {}

  async redeem(childUserId: string, rewardId: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.REWARD_NOT_FOUND,
        message: '奖励不存在',
      });
    }
    if (reward.status !== 'ACTIVE') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.REWARD_INACTIVE,
        message: '奖励已下架',
      });
    }
    if (reward.stock <= 0) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.REWARD_OUT_OF_STOCK,
        message: '奖励库存不足',
      });
    }
    // 校验孩子属于该奖励的家长
    const profile = await this.prisma.childProfile.findUnique({ where: { userId: childUserId } });
    if (!profile || profile.parentUserId !== reward.parentId) {
      throw new ForbiddenException({
        success: false,
        code: ErrorCode.FORBIDDEN,
        message: '不能兑换其他家庭的奖励',
      });
    }
    const { balance } = await this.points.getBalance(childUserId);
    if (balance < reward.pointsCost) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INSUFFICIENT_POINTS,
        message: '积分不足',
      });
    }

    // 创建兑换单并扣减库存、扣积分（同一事务内保证一致）
    const redemption = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rewardRedemption.create({
        data: {
          rewardId: reward.id,
          childId: childUserId,
          parentId: reward.parentId,
          pointsCost: reward.pointsCost,
          status: 'PENDING',
        },
      });
      await tx.reward.update({
        where: { id: reward.id, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      // 扣除积分（幂等，bizKey 唯一）
      await this.points.deduct(
        tx,
        childUserId,
        reward.pointsCost,
        'REWARD_REDEEM',
        created.id,
        `REWARD_REDEEM:${created.id}`,
        `兑换 ${reward.name}`,
      );
      return created;
    });

    await this.activities.recordByUser(childUserId, reward.parentId, {
      type: 'REDEMPTION_APPLIED',
      text: `申请兑换「${reward.name}」`,
      status: 'PENDING',
      refType: 'REWARD',
      refId: reward.id,
    });
    return { message: '兑换成功，等待家长确认', redemptionId: redemption.id };
  }

  async listForParent(parentId: string) {
    return this.prisma.rewardRedemption.findMany({
      where: { parentId },
      include: { reward: true, child: { select: { nickname: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForChild(childUserId: string) {
    return this.prisma.rewardRedemption.findMany({
      where: { childId: childUserId },
      include: { reward: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertParentOwns(parentId: string, redemptionId: string) {
    const r = await this.prisma.rewardRedemption.findUnique({ where: { id: redemptionId } });
    if (!r || r.parentId !== parentId) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.REDEMPTION_NOT_FOUND,
        message: '兑换记录不存在',
      });
    }
    return r;
  }

  async approve(parentId: string, redemptionId: string) {
    const r = await this.assertParentOwns(parentId, redemptionId);
    if (r.status !== 'PENDING') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INVALID_REDEMPTION_STATUS,
        message: '仅待确认兑换可以同意',
      });
    }
    const reward = await this.prisma.reward.findUnique({ where: { id: r.rewardId } });
    const updated = await this.prisma.rewardRedemption.update({
      where: { id: redemptionId },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    });
    await this.activities.recordByUser(r.childId, parentId, {
      type: 'REDEMPTION_APPROVED',
      text: `兑换「${reward?.name ?? '奖励'}」已同意`,
      status: 'APPROVED',
      refType: 'REWARD',
      refId: redemptionId,
    });
    return updated;
  }

  async reject(parentId: string, redemptionId: string) {
    const r = await this.assertParentOwns(parentId, redemptionId);
    if (r.status !== 'PENDING') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INVALID_REDEMPTION_STATUS,
        message: '仅待确认兑换可以拒绝',
      });
    }
    const reward = await this.prisma.reward.findUnique({ where: { id: r.rewardId } });
    await this.prisma.$transaction(async (tx) => {
      await tx.rewardRedemption.update({
        where: { id: redemptionId },
        data: { status: 'REJECTED', reviewedAt: new Date() },
      });
      // 退回积分（幂等）
      await this.points.award(
        tx,
        r.childId,
        r.pointsCost,
        PointsType.REWARD_REFUND,
        'REWARD_REFUND',
        redemptionId,
        `REWARD_REFUND:${redemptionId}`,
        `兑换「${reward?.name ?? '奖励'}」被拒绝，积分退回`,
      );
      // 恢复库存
      if (reward) {
        await tx.reward.update({ where: { id: reward.id }, data: { stock: { increment: 1 } } });
      }
    });
    await this.activities.recordByUser(r.childId, parentId, {
      type: 'REDEMPTION_REJECTED',
      text: `兑换「${reward?.name ?? '奖励'}」被拒绝，积分已退回`,
      status: 'REJECTED',
      refType: 'REWARD',
      refId: redemptionId,
    });
    return { message: '已拒绝，积分已退回' };
  }

  async fulfill(parentId: string, redemptionId: string) {
    const r = await this.assertParentOwns(parentId, redemptionId);
    if (r.status !== 'APPROVED') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INVALID_REDEMPTION_STATUS,
        message: '仅已同意的兑换可以完成',
      });
    }
    const reward = await this.prisma.reward.findUnique({ where: { id: r.rewardId } });
    const updated = await this.prisma.rewardRedemption.update({
      where: { id: redemptionId },
      data: { status: 'FULFILLED', completedAt: new Date() },
    });
    await this.activities.recordByUser(r.childId, parentId, {
      type: 'REDEMPTION_FULFILLED',
      text: `「${reward?.name ?? '奖励'}」已发放给宝贝`,
      status: 'FULFILLED',
      refType: 'REWARD',
      refId: redemptionId,
    });
    return updated;
  }
}
