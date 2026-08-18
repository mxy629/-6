import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { BusinessException, ErrorCode } from '../common/exceptions';
import { CreateChildDto, UpdateChildDto, ResetPinDto } from './dto';

@Injectable()
export class ChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private async assertOwned(parentId: string, childUserId: string) {
    const profile = await this.prisma.childProfile.findUnique({
      where: { userId: childUserId },
    });
    if (!profile || profile.parentUserId !== parentId) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.CHILD_NOT_FOUND,
        message: '孩子不存在',
      });
    }
    return profile;
  }

  async create(parentId: string, dto: CreateChildDto) {
    const pinHash = await bcrypt.hash(dto.pin, 10);
    try {
      const child = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { role: 'CHILD', nickname: dto.nickname },
        });
        const profile = await tx.childProfile.create({
          data: {
            userId: user.id,
            parentUserId: parentId,
            loginName: dto.loginName,
            pinPasswordHash: pinHash,
          },
        });
        await tx.pointsWallet.create({ data: { childId: profile.id, balance: 0 } });
        return this.toDto(profile, user.nickname, user.avatarUrl ?? '');
      });
      await this.activities.recordByUser(child.id, parentId, {
        type: 'CHILD_JOINED',
        text: `${child.nickname} 加入了成长星球`,
        status: 'ACTIVE',
      });
      return child;
    } catch (err) {
      // 登录名唯一约束冲突：返回友好错误，而非 500
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BusinessException(
          ErrorCode.CHILD_LOGINNAME_CONFLICT,
          '该登录名已被使用，请换一个',
        );
      }
      throw err;
    }
  }

  async findAll(parentId: string) {
    const profiles = await this.prisma.childProfile.findMany({
      where: { parentUserId: parentId },
      include: { user: true },
    });
    return profiles.map((p) => this.toDto(p, p.user.nickname, p.user.avatarUrl ?? ''));
  }

  async findOne(parentId: string, childUserId: string) {
    const p = await this.assertOwned(parentId, childUserId);
    const user = await this.prisma.user.findUnique({ where: { id: p.userId } });
    return this.toDto(p, user?.nickname ?? '', user?.avatarUrl ?? '');
  }

  async update(parentId: string, childUserId: string, dto: UpdateChildDto) {
    const p = await this.assertOwned(parentId, childUserId);
    if (dto.nickname) {
      await this.prisma.user.update({
        where: { id: p.userId },
        data: { nickname: dto.nickname },
      });
    }
    const user = await this.prisma.user.findUnique({ where: { id: p.userId } });
    return this.toDto(p, user?.nickname ?? '', user?.avatarUrl ?? '');
  }

  async resetPin(parentId: string, childUserId: string, dto: ResetPinDto) {
    const p = await this.assertOwned(parentId, childUserId);
    const pinHash = await bcrypt.hash(dto.pin, 10);
    await this.prisma.childProfile.update({
      where: { id: p.id },
      data: { pinPasswordHash: pinHash },
    });
    return { message: 'PIN 已重置' };
  }

  // 家长为孩子设定目标奖励（家长拥有的奖励均可）
  async setGoal(parentId: string, childUserId: string, rewardId: string) {
    const p = await this.assertOwned(parentId, childUserId);
    const reward = await this.prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.parentId !== parentId) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.REWARD_NOT_FOUND,
        message: '奖励不存在或不属于当前家长',
      });
    }
    await this.prisma.childProfile.update({
      where: { id: p.id },
      data: { goalRewardId: rewardId },
    });
    return { message: '已设为孩子的目标奖励' };
  }

  // 孩子自选目标奖励（仅限上架且属于自己家长的奖励）；rewardId 为空表示取消目标
  async setChildGoal(childUserId: string, rewardId: string) {
    const profile = await this.prisma.childProfile.findUnique({ where: { userId: childUserId } });
    if (!profile) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.CHILD_NOT_FOUND,
        message: '孩子不存在',
      });
    }
    if (!rewardId) {
      await this.prisma.childProfile.update({
        where: { id: profile.id },
        data: { goalRewardId: null },
      });
      return { message: '已取消目标奖励' };
    }
    const reward = await this.prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.parentId !== profile.parentUserId) {
      throw new NotFoundException({
        success: false,
        code: ErrorCode.REWARD_NOT_FOUND,
        message: '奖励不存在或不可用',
      });
    }
    if (reward.status !== 'ACTIVE') {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.REWARD_INACTIVE,
        message: '该奖励暂不可设为目标',
      });
    }
    await this.prisma.childProfile.update({
      where: { id: profile.id },
      data: { goalRewardId: rewardId },
    });
    return { message: '已设为目标奖励' };
  }

  // 删除孩子：在同一事务内清理其全部派生数据，再删除账号本身。
  // 注意：PointsLedger/PointsWallet 的 childId 存的是 ChildProfile.id（与 User.id 不同），
  // 故需先解析 profile.id 再据此清理；顺序上先删叶子，再删 ChildProfile，最后删 User。
  async remove(parentId: string, childUserId: string) {
    await this.assertOwned(parentId, childUserId);
    const profile = await this.prisma.childProfile.findUnique({ where: { userId: childUserId } });
    if (!profile) return { message: '孩子账号已删除' };
    const pid = profile.id;
    await this.prisma.$transaction(async (tx) => {
      await tx.rewardRedemption.deleteMany({ where: { childId: childUserId } });
      await tx.taskInstance.deleteMany({ where: { childId: childUserId } });
      await tx.pointsLedger.deleteMany({ where: { childId: pid } });
      await tx.pointsWallet.deleteMany({ where: { childId: pid } });
      await tx.childProfile.deleteMany({ where: { userId: childUserId } });
      await tx.user.delete({ where: { id: childUserId } });
    });
    return { message: '孩子账号已删除' };
  }

  private toDto(
    profile: { id: string; userId: string; loginName: string; pointsBalance: number; level: number },
    nickname: string,
    avatarUrl: string,
  ) {
    return {
      id: profile.userId,
      profileId: profile.id,
      nickname,
      avatarUrl,
      loginName: profile.loginName,
      pointsBalance: profile.pointsBalance,
      level: profile.level,
    };
  }
}
