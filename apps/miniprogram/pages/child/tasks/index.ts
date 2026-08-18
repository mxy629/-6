import { api } from '../../../services/request';
import { TaskStatusLabel } from '../../../utils/format';
import { TaskInstanceDto } from '../../../types';

type Filter = 'ALL' | 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

Page({
  data: {
    loading: true,
    filter: 'ALL' as Filter,
    tasks: [] as Array<TaskInstanceDto & { statusText: string }>,
    filters: [
      { key: 'ALL', label: '全部' },
      { key: 'PENDING', label: '待完成' },
      { key: 'SUBMITTED', label: '审核中' },
      { key: 'APPROVED', label: '已完成' },
      { key: 'REJECTED', label: '需重交' },
    ],
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.tasks.length) this.setData({ loading: true });
    try {
      const list = await api.get<TaskInstanceDto[]>('/child/tasks');
      const mapped = list.map((t) => ({ ...t, statusText: TaskStatusLabel[t.status] || t.status }));
      this.setData({ tasks: mapped, loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  setFilter(e: any) {
    this.setData({ filter: e.currentTarget.dataset.key });
  },

  get filtered() {
    const f = this.data.filter;
    if (f === 'ALL') return this.data.tasks;
    return this.data.tasks.filter((t: TaskInstanceDto & { statusText: string }) => t.status === f);
  },

  onTaskTap(e: any) {
    wx.navigateTo({ url: `/pages/child/task-detail/index?instanceId=${e.detail.instanceId}` });
  },

  onTaskAction(e: any) {
    wx.navigateTo({ url: `/pages/child/task-detail/index?instanceId=${e.detail.instanceId}` });
  },
});
