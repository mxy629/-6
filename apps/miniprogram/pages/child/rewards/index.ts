import { api } from '../../../services/request';
import { RewardDto } from '../../../types';

interface RewardView extends RewardDto {
  remaining: number;
}

Page({
  data: {
    loading: true,
    balance: 0,
    goalId: '' as string,
    rewards: [] as (RewardView & { isGoal: boolean })[],
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.rewards.length) this.setData({ loading: true });
    try {
      const [b, list, dash] = await Promise.all([
        api.get<{ balance: number }>('/points/balance'),
        api.get<RewardDto[]>('/child/rewards'),
        api.get<{ goalRewardId?: string | null }>('/child/dashboard'),
      ]);
      const goalId = dash?.goalRewardId ?? '';
      const rewards = (list || []).map((r) => ({
        ...r,
        remaining: Math.max(0, r.pointsCost - b.balance),
        isGoal: r.id === goalId,
      }));
      this.setData({ balance: b.balance, goalId, rewards, loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  async onRedeem(e: any) {
    const rewardId = e.detail.rewardId;
    const reward = this.data.rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    const remaining = reward.pointsCost - this.data.balance;
    const tip =
      remaining > 0
        ? `还差 ${remaining} 积分，暂时无法兑换`
        : `兑换「${reward.name}」需要 ${reward.pointsCost} 积分，兑换后剩余 ${this.data.balance - reward.pointsCost} 积分。`;
    const res = await wx.showModal({
      title: '确认兑换',
      content: tip,
      confirmText: '确认兑换',
      showCancel: remaining <= 0,
    });
    if (!res.confirm) return;
    try {
      await api.post(`/rewards/${rewardId}/redeem`);
      wx.showToast({ title: '兑换成功，等待家长确认', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  async onSetGoal(e: any) {
    const rewardId = e.detail.rewardId;
    const reward = this.data.rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    const willClear = this.data.goalId === rewardId;
    const res = await wx.showModal({
      title: willClear ? '取消目标奖励' : '设为目标奖励',
      content: willClear
        ? `确定取消「${reward.name}」作为目标？`
        : `把「${reward.name}」设为你的目标奖励，努力攒积分去兑换它吧！`,
      confirmText: willClear ? '取消目标' : '设为目标',
    });
    if (!res.confirm) return;
    try {
      await api.post('/child/goal', { rewardId: willClear ? '' : rewardId });
      wx.showToast({ title: willClear ? '已取消目标' : '已设为目标', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },
});
