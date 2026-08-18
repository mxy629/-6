import { api } from '../../../services/request';
import { store } from '../../../stores/app';
import { TaskStatusLabel, formatDate } from '../../../utils/format';
import { ChildDashboard } from '../../../types';

function greeting(name: string): string {
  const h = new Date().getHours();
  const prefix = h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好';
  return `${prefix}，${name} 👋`;
}

function encourage(total: number, completed: number): string {
  if (total === 0) return '今天还没有任务，去放松一下～';
  const remain = total - completed;
  if (remain <= 0) return '太棒了，今天所有任务都完成啦！';
  return `今天再完成 ${remain} 个任务，就全部完成啦`;
}

Page({
  data: {
    role: 'CHILD',
    loading: true,
    dashboard: null as ChildDashboard | null,
    activitiesView: [] as Array<{ type: string; text: string; status: string; at: string }>,
    greeting: '',
    encourage: '',
    goalProgress: 0,
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.dashboard) this.setData({ loading: true });
    try {
      const d = await api.get<ChildDashboard>('/child/dashboard');
      d.todayTasks = (d.todayTasks || []).map((t) => ({
        ...t,
        statusText: TaskStatusLabel[t.status] || t.status,
      }));
      const activitiesView = (d.recentActivities || []).map((a) => ({
        ...a,
        at: formatDate(a.at),
      }));
      const goal = d.rewardGoal;
      const goalProgress = goal && goal.cost > 0 ? Math.min(100, Math.round(((goal.cost - goal.remaining) / goal.cost) * 100)) : 0;
      this.setData({
        dashboard: d,
        activitiesView,
        greeting: greeting(d.profile.nickname),
        encourage: encourage(d.todayTasks.length, d.todayTasks.filter((t) => t.status === 'APPROVED').length),
        goalProgress,
        loading: false,
      });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  statusText(status: string) {
    return TaskStatusLabel[status] || status;
  },

  onTaskAction(e: any) {
    wx.navigateTo({ url: `/pages/child/task-detail/index?instanceId=${e.detail.instanceId}` });
  },

  onTaskTap(e: any) {
    wx.navigateTo({ url: `/pages/child/task-detail/index?instanceId=${e.detail.instanceId}` });
  },

  goRewards() {
    wx.switchTab({ url: '/pages/child/rewards/index' });
  },

  goTasks() {
    wx.switchTab({ url: '/pages/child/tasks/index' });
  },

  logout() {
    store.logout();
  },
});
