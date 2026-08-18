import { api } from '../../../services/request';
import { formatDate, TaskStatusLabel } from '../../../utils/format';
import { store } from '../../../stores/app';
import { ParentDashboard, ChildDto, TaskInstanceDto } from '../../../types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return '早上好 👋';
  if (h < 18) return '下午好 👋';
  return '晚上好 👋';
}

function progressText(completed: number, total: number): string {
  if (total === 0) return '今天还没有任务';
  if (completed === 0) return '今天再完成1个任务，开始积累积分吧';
  if (completed >= total) return '太棒了，今日任务全部完成！';
  return `再完成 ${total - completed} 个任务，就全部完成啦`;
}

Page({
  data: {
    loading: true,
    greeting: greeting(),
    dash: null as (ParentDashboard & { activitiesView?: Array<any> }) | null,
    children: [] as ChildDto[],
    childIndex: 0,
    currentChildId: '' as string,
    todayTotal: 0,
    progressLabel: '',
    pendingAll: 0,
  },

  onShow() {
    this.setData({ greeting: greeting() });
    this.loadChildren(false);
  },

  async loadChildren(force = true) {
    try {
      if (force || !this.data.children.length) this.setData({ loading: true });
      // 并行获取孩子列表与默认(首个孩子)看板，减少首屏等待
      const [children, defaultDash] = await Promise.all([
        api.get<ChildDto[]>('/children'),
        api.get<ParentDashboard>('/parent/dashboard'),
      ]);
      const firstId = (children[0] && children[0].id) || '';
      const persisted = this.data.currentChildId;
      const currentChildId = persisted || firstId;
      this.setData({ children, currentChildId });
      if (persisted && persisted !== firstId) {
        const d = await api.get<ParentDashboard>(`/parent/dashboard?childId=${persisted}`);
        this.applyDash(d);
      } else {
        this.applyDash(defaultDash);
      }
      this.setData({ loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  async load(childId?: string, force = true) {
    try {
      if (force || !this.data.dash) this.setData({ loading: true });
      const url = childId ? `/parent/dashboard?childId=${childId}` : '/parent/dashboard';
      const d = await api.get<ParentDashboard>(url);
      this.applyDash(d);
      this.setData({ loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  applyDash(d: ParentDashboard) {
    const activitiesView = (d.recentActivities || []).map((a) => ({
      ...a,
      at: formatDate(a.at),
    }));
    const todayTasks = (d.todayTasks || []).map((t: TaskInstanceDto) => ({
      ...t,
      statusText: TaskStatusLabel[t.status] || t.status,
    }));
    const pendingReviewItems = (d.pendingReviewItems || []).map((r) => ({
      ...r,
      submittedAt: formatDate(r.submittedAt),
    }));
    const pendingRedemptionItems = (d.pendingRedemptionItems || []).map((r) => ({
      ...r,
      createdAt: formatDate(r.createdAt),
    }));
    const todayTotal = todayTasks.length;
    const pendingAll = (d.pendingReviews || 0) + (d.pendingRedemptions || 0);
    this.setData({
      dash: { ...d, activitiesView, todayTasks, pendingReviewItems, pendingRedemptionItems },
      todayTotal,
      progressLabel: progressText(d.todayCompleted, todayTotal),
      pendingAll,
    });
    // 更新底部 Tab 红点
    store.setBadges({ reviews: d.pendingReviews, rewards: d.pendingRedemptions });
    const nb = this.selectComponent('#navbar');
    if (nb) nb.setData({ badges: store.badges });
  },

  onSwitchChild(e: any) {
    const idx = Number(e.detail.value);
    const child = this.data.children[idx];
    if (!child || child.id === this.data.currentChildId) return;
    this.setData({ childIndex: idx, currentChildId: child.id });
    this.load(child.id, true);
  },

  goTasks() {
    wx.navigateTo({ url: '/pages/parent/tasks/index' });
  },
  goReviews() {
    wx.navigateTo({ url: '/pages/parent/reviews/index' });
  },
  goRedemptions() {
    wx.navigateTo({ url: '/pages/parent/redemptions/index' });
  },
  goTaskForm() {
    wx.navigateTo({ url: '/pages/parent/task-form/index' });
  },
  goRewardForm() {
    wx.navigateTo({ url: '/pages/parent/rewards/index' });
  },
  goLedger() {
    if (this.data.currentChildId) {
      wx.navigateTo({ url: `/pages/parent/ledger/index?childId=${this.data.currentChildId}` });
    }
  },
  onTaskTap(e: any) {
    wx.navigateTo({ url: `/pages/parent/tasks/index` });
  },
});
