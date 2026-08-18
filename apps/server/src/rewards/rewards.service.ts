import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { BusinessException, ErrorCode } from '../common/exceptions';
import { RewardStatus } from '../common/enums';
import { CreateRewardDto, UpdateRewardDto } from './dto';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwned(parentId: string, rewardId: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.parentId !== parentId) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.REWARD_NOT_FOUND,
        message: '奖励不存在',
      });
    }
    return reward;
  }

  private async getParentOfChild(childUserId: string) {
    const profile = await this.prisma.childProfile.findUnique({ where: { userId: childUserId } });
    if (!profile) {
      throw new ForbiddenException({
        success: false,
        code: ErrorCode.CHILD_NOT_FOUND,
        message: '孩子档案不存在',
      });
    }
    return profile.parentUserId;
  }

  async create(parentId: string, dto: CreateRewardDto) {
    if (dto.childId) {
      const profile = await this.prisma.childProfile.findUnique({ where: { userId: dto.childId } });
      if (!profile || profile.parentUserId !== parentId) {
        throw new ForbiddenException({
          success: false,
          code: ErrorCode.CHILD_NOT_FOUND,
          message: '孩子不存在或不属于当前家长',
        });
      }
    }
    return this.prisma.reward.create({
      data: {
        parentId,
        childId: dto.childId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        pointsCost: dto.pointsCost,
        stock: dto.stock,
        status: RewardStatus.DRAFT,
      },
    });
  }

  async findAllForParent(parentId: string) {
    return this.prisma.reward.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForParent(parentId: string, id: string) {
    return this.assertOwned(parentId, id);
  }

  async update(parentId: string, id: string, dto: UpdateRewardDto) {
    // 任意状态下均可修改：读取当前数据 → 改 → 保存回数据仓库
    await this.assertOwned(parentId, id);
    return this.prisma.reward.update({ where: { id }, data: { ...dto } });
  }

  async publish(parentId: string, id: string) {
    const reward = await this.assertOwned(parentId, id);
    // 已是上架态则幂等返回
    if (reward.status === RewardStatus.ACTIVE) return reward;
    return this.prisma.reward.update({ where: { id }, data: { status: RewardStatus.ACTIVE } });
  }

  async remove(parentId: string, id: string) {
    await this.assertOwned(parentId, id);
    return this.prisma.reward.update({ where: { id }, data: { status: RewardStatus.INACTIVE } });
  }

  async hardRemove(parentId: string, id: string) {
    const reward = await this.assertOwned(parentId, id);
    const count = await this.prisma.rewardRedemption.count({ where: { rewardId: id } });
    if (count > 0) {
      throw new BusinessException(
        ErrorCode.REWARD_HAS_REDEMPTIONS,
        '该奖励已有兑换记录，无法删除',
      );
    }
    await this.prisma.reward.delete({ where: { id } });
    return { id: reward.id };
  }

  async listForChild(childUserId: string) {
    const parentId = await this.getParentOfChild(childUserId);
    return this.prisma.reward.findMany({
      where: { parentId, status: 'ACTIVE', OR: [{ childId: null }, { childId: childUserId }] },
      orderBy: { pointsCost: 'asc' },
    });
  }

  async findOneForChild(childUserId: string, id: string) {
    const parentId = await this.getParentOfChild(childUserId);
    const reward = await this.prisma.reward.findFirst({
      where: { id, parentId, status: 'ACTIVE', OR: [{ childId: null }, { childId: childUserId }] },
    });
    if (!reward) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.REWARD_NOT_FOUND,
        message: '奖励不存在',
      });
    }
    return reward;
  }
}
