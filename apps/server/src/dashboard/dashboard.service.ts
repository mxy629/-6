import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PointsService } from '../points/points.service';
import { RewardsService } from '../rewards/rewards.service';
import { ChildrenService } from '../children/children.service';
import { ActivitiesService } from '../activities/activities.service';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
    private readonly rewards: RewardsService,
    private readonly children: ChildrenService,
    private readonly activities: ActivitiesService,
  ) {}

  async childDashboard(childUserId: string) {
    const profile = await this.prisma.childProfile.findUnique({
      where: { userId: childUserId },
      include: { user: true },
    });
    const { balance } = await this.points.getBalance(childUserId);
    const todayTasks = await this.prisma.taskInstance.findMany({
      where: { childId: childUserId, date: startOfDay(new Date()), status: { not: 'CANCELLED' } },
      include: { task: true },
      orderBy: { deadlineAt: 'asc' },
    });
    const rewards = await this.rewards.listForChild(childUserId);
    let rewardGoal: { name: string; cost: number; remaining: number } | null = null;
    const goalRewardId = profile?.goalRewardId ?? null;
    const chosen = goalRewardId ? rewards.find((r) => r.id === goalRewardId && r.status === 'ACTIVE') : undefined;
    if (chosen) {
      rewardGoal = {
        name: chosen.name,
        cost: chosen.pointsCost,
        remaining: Math.max(0, chosen.pointsCost - balance),
      };
    } else if (rewards.length) {
      const cheapest = rewards.reduce((a, b) => (a.pointsCost <= b.pointsCost ? a : b));
      rewardGoal = {
        name: cheapest.name,
        cost: cheapest.pointsCost,
        remaining: Math.max(0, cheapest.pointsCost - balance),
      };
    }
    const recentActivities = await this.activities.listForChild(childUserId);
    return {
      profile: { nickname: profile?.user.nickname ?? '', avatarUrl: profile?.user.avatarUrl ?? '' },
      points: { balance },
      todayTasks,
      rewardGoal,
      goalRewardId,
      recentActivities,
    };
  }

  async parentDashboard(parentId: string, childUserId?: string) {
    const children = await this.children.findAll(parentId);
    const targetId = childUserId || children[0]?.id;
    const today = startOfDay(new Date());

    const todayCompleted = targetId
      ? await this.prisma.taskInstance.count({
          where: { childId: targetId, date: today, status: 'APPROVED' },
        })
      : 0;
    const todayEarned = targetId
      ? await this.prisma.pointsLedger.aggregate({
          where: {
            childId: (await this.profileId(targetId)) ?? '',
            type: 'TASK_REWARD',
            createdAt: { gte: today },
          },
          _sum: { amount: true },
        })
      : { _sum: { amount: 0 } };
    const pendingReviews = await this.prisma.taskInstance.count({
      where: { status: 'SUBMITTED', task: { parentId } },
    });
    const pendingRedemptions = await this.prisma.rewardRedemption.count({
      where: { parentId, status: 'PENDING' },
    });

    const [todayTasks, pendingReviewItems, pendingRedemptionItems, activities, streak] = await Promise.all([
      targetId
        ? this.prisma.taskInstance.findMany({
            where: { childId: targetId, date: today, status: { not: 'CANCELLED' } },
            include: { task: true },
            orderBy: { deadlineAt: 'asc' },
          })
        : Promise.resolve([]),
      this.prisma.taskInstance.findMany({
        where: { status: 'SUBMITTED', task: { parentId } },
        include: {
          task: true,
          submissions: { orderBy: { createdAt: 'desc' }, take: 1, include: { images: true } },
        },
        orderBy: { submittedAt: 'asc' },
        take: 10,
      }),
      this.prisma.rewardRedemption.findMany({
        where: { parentId, status: 'PENDING' },
        include: { reward: true, child: true },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      this.activities.listForParent(parentId, targetId),
      targetId ? this.streakDays(targetId) : 0,
    ]);
    const childInfo = children.find((c) => c.id === targetId);
    const childMap = new Map(children.map((c) => [c.id, { nickname: c.nickname, avatarUrl: c.avatarUrl }]));
    const pendingReviewItemsWithChild = pendingReviewItems.map((item: any) => ({
      ...item,
      child: childMap.get(item.childId) || { nickname: '孩子', avatarUrl: '' },
    }));

    return {
      child: childInfo
        ? { id: childInfo.id, nickname: childInfo.nickname, avatarUrl: childInfo.avatarUrl ?? '', pointsBalance: childInfo.pointsBalance, streak }
        : null,
      todayCompleted,
      todayEarned: todayEarned._sum.amount ?? 0,
      pendingReviews,
      pendingRedemptions,
      todayTasks,
      pendingReviewItems: pendingReviewItemsWithChild,
      pendingRedemptionItems,
      recentActivities: activities,
    };
  }

  private async profileId(childUserId: string) {
    const p = await this.prisma.childProfile.findUnique({ where: { userId: childUserId } });
    return p?.id;
  }

  private async streakDays(childUserId: string): Promise<number> {
    const approved = await this.prisma.taskInstance.findMany({
      where: { childId: childUserId, status: 'APPROVED' },
      select: { date: true },
      orderBy: { date: 'desc' },
    });
    const unique = Array.from(new Set(approved.map((i) => startOfDay(i.date).getTime()))).sort((a, b) => b - a);
    if (unique.length === 0) return 0;
    const today = startOfDay(new Date()).getTime();
    const latest = unique[0];
    if (latest !== today && latest !== today - DAY_MS) return 0;
    let streak = 1;
    for (let i = 1; i < unique.length; i++) {
      if (unique[i] === today - i * DAY_MS) streak++;
      else break;
    }
    return streak;
  }
}
