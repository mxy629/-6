import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ErrorCode } from '../common/exceptions';
import { PointsType } from '../common/enums';

@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 增加积分（任务奖励、退款等）。通过 bizKey 唯一索引保证幂等。
   * 可传入外部事务 client (tx) 以保证与调用方在同一事务内，避免嵌套事务。
   */
  async award(
    tx: Prisma.TransactionClient | null,
    childUserId: string,
    amount: number,
    type: PointsType,
    bizType: string,
    bizId: string,
    bizKey: string,
    description?: string,
  ) {
    if (tx) return this.doAward(tx, childUserId, amount, type, bizType, bizId, bizKey, description);
    return this.prisma.$transaction((t) =>
      this.doAward(t, childUserId, amount, type, bizType, bizId, bizKey, description),
    );
  }

  private async doAward(
    tx: Prisma.TransactionClient,
    childUserId: string,
    amount: number,
    type: PointsType,
    bizType: string,
    bizId: string,
    bizKey: string,
    description?: string,
  ) {
    const existing = await tx.pointsLedger.findUnique({ where: { bizKey } });
    if (existing) return existing;

    const profile = await tx.childProfile.findUnique({
      where: { userId: childUserId },
      include: { wallet: true },
    });
    if (!profile) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.CHILD_NOT_FOUND,
        message: '孩子档案不存在',
      });
    }
    const wallet =
      profile.wallet ?? (await tx.pointsWallet.create({ data: { childId: profile.id, balance: 0 } }));

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;
    if (balanceAfter < 0) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INSUFFICIENT_POINTS,
        message: '积分不足',
      });
    }
    await tx.pointsWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
    await tx.childProfile.update({ where: { id: profile.id }, data: { pointsBalance: balanceAfter } });
    return tx.pointsLedger.create({
      data: {
        childId: profile.id,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        bizType,
        bizId,
        bizKey,
        description,
      },
    });
  }

  /**
   * 扣减积分（兑换奖励）。在事务内重新读取余额并校验，防止并发透支。
   * 可传入外部事务 client (tx) 以保证与调用方在同一事务内。
   */
  async deduct(
    tx: Prisma.TransactionClient | null,
    childUserId: string,
    amount: number,
    bizType: string,
    bizId: string,
    bizKey: string,
    description?: string,
  ) {
    if (tx) return this.doDeduct(tx, childUserId, amount, bizType, bizId, bizKey, description);
    return this.prisma.$transaction((t) =>
      this.doDeduct(t, childUserId, amount, bizType, bizId, bizKey, description),
    );
  }

  private async doDeduct(
    tx: Prisma.TransactionClient,
    childUserId: string,
    amount: number,
    bizType: string,
    bizId: string,
    bizKey: string,
    description?: string,
  ) {
    const existing = await tx.pointsLedger.findUnique({ where: { bizKey } });
    if (existing) return existing;

    const profile = await tx.childProfile.findUnique({
      where: { userId: childUserId },
      include: { wallet: true },
    });
    if (!profile) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.CHILD_NOT_FOUND,
        message: '孩子档案不存在',
      });
    }
    const wallet =
      profile.wallet ?? (await tx.pointsWallet.create({ data: { childId: profile.id, balance: 0 } }));

    const balanceBefore = wallet.balance;
    if (balanceBefore < amount) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INSUFFICIENT_POINTS,
        message: '积分不足',
      });
    }
    const balanceAfter = balanceBefore - amount;
    await tx.pointsWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
    await tx.childProfile.update({ where: { id: profile.id }, data: { pointsBalance: balanceAfter } });
    return tx.pointsLedger.create({
      data: {
        childId: profile.id,
        type: PointsType.REWARD_REDEEM,
        amount: -amount,
        balanceBefore,
        balanceAfter,
        bizType,
        bizId,
        bizKey,
        description,
      },
    });
  }

  async getBalance(childUserId: string) {
    const profile = await this.prisma.childProfile.findUnique({
      where: { userId: childUserId },
      include: { wallet: true },
    });
    return { balance: profile?.wallet?.balance ?? 0 };
  }

  async getLedger(childUserId: string) {
    const profile = await this.prisma.childProfile.findUnique({
      where: { userId: childUserId },
    });
    if (!profile) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.CHILD_NOT_FOUND,
        message: '孩子档案不存在',
      });
    }
    return this.prisma.pointsLedger.findMany({
      where: { childId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
