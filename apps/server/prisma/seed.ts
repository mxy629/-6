import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const openId = 'dev_openid_seed_parent';
  let parent = await prisma.user.findUnique({ where: { wechatOpenId: openId } });
  if (!parent) {
    parent = await prisma.user.create({
      data: { role: 'PARENT', nickname: '测试家长', wechatOpenId: openId },
    });
  }

  const loginName = 'xiaoyu';
  let profile = await prisma.childProfile.findFirst({ where: { loginName } });
  if (!profile) {
    const pinHash = await bcrypt.hash('2580', 10);
    const child = await prisma.user.create({ data: { role: 'CHILD', nickname: '小宇' } });
    profile = await prisma.childProfile.create({
      data: {
        userId: child.id,
        parentUserId: parent.id,
        loginName,
        pinPasswordHash: pinHash,
        pointsBalance: 360,
      },
    });
    await prisma.pointsWallet.create({ data: { childId: profile.id, balance: 360 } });
    await prisma.pointsLedger.create({
      data: {
        childId: profile.id,
        type: 'TASK_REWARD',
        amount: 360,
        balanceBefore: 0,
        balanceAfter: 360,
        bizType: 'SEED',
        bizId: 'seed',
        bizKey: 'SEED:initial',
        description: '初始积分',
      },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskSeeds = [
    { title: '阅读20分钟', rewardPoints: 20, taskType: 'STUDY' },
    { title: '整理书桌', rewardPoints: 10, taskType: 'HOUSEWORK' },
    { title: '跳绳100个', rewardPoints: 15, taskType: 'SPORT' },
  ];
  for (const t of taskSeeds) {
    const exist = await prisma.task.findFirst({
      where: { parentId: parent.id, childId: profile.userId, title: t.title },
    });
    if (!exist) {
      const task = await prisma.task.create({
        data: {
          parentId: parent.id,
          childId: profile.userId,
          title: t.title,
          rewardPoints: t.rewardPoints,
          taskType: t.taskType,
          repeatType: 'NONE',
          startDate: today,
          status: 'ACTIVE',
        },
      });
      await prisma.taskInstance.create({
        data: { taskId: task.id, childId: profile.userId, date: today, status: 'PENDING' },
      });
    }
  }

  const rewardSeeds = [
    { name: '乐高玩具', pointsCost: 500, stock: 2 },
    { name: '看电影一次', pointsCost: 200, stock: 5 },
    { name: '游戏时间30分钟', pointsCost: 300, stock: 3 },
    { name: '选择一次晚餐', pointsCost: 150, stock: 10 },
  ];
  for (const r of rewardSeeds) {
    const exist = await prisma.reward.findFirst({
      where: { parentId: parent.id, name: r.name },
    });
    if (!exist) {
      await prisma.reward.create({
        data: {
          parentId: parent.id,
          name: r.name,
          pointsCost: r.pointsCost,
          stock: r.stock,
          status: 'ACTIVE',
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed 完成：家长(测试家长) / 孩子(小宇, PIN=2580) / 任务 / 奖励 / 积分360');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
