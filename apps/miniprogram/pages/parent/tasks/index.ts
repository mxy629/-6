import { api } from '../../../services/request';
import { TaskTypeLabel } from '../../../utils/format';
import { ChildDto } from '../../../types';

interface TaskView {
  id: string;
  title: string;
  taskType: string;
  rewardPoints: number;
  status: string;
  childId: string;
  childName?: string;
  instanceCount: number;
}

const TYPE_VALUES = ['ALL', 'STUDY', 'HOUSEWORK', 'SPORT', 'HABIT', 'DAILY', 'OTHER'];

Page({
  data: {
    loading: true,
    tasks: [] as TaskView[],
    displayTasks: [] as TaskView[],
    childMap: {} as Record<string, string>,
    keyword: '' as string,
    typeFilter: 'ALL' as string,
    typeValues: TYPE_VALUES,
    typeLabels: ['全部', ...TYPE_VALUES.slice(1).map((v) => TaskTypeLabel[v] || v)],
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.tasks.length) this.setData({ loading: true });
    try {
      const [list, children] = await Promise.all([
        api.get<TaskView[]>('/tasks'),
        api.get<ChildDto[]>('/children'),
      ]);
      const childMap: Record<string, string> = {};
      (children || []).forEach((c) => (childMap[c.id] = c.nickname));
      const tasks = list.map((t) => ({ ...t, childName: childMap[t.childId] || '未知' }));
      this.setData({ tasks, childMap });
      this.applyFilter();
      this.setData({ loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  applyFilter() {
    const kw = this.data.keyword.trim().toLowerCase();
    const tf = this.data.typeFilter;
    const displayTasks = this.data.tasks.filter((t) => {
      const matchKw = !kw || t.title.toLowerCase().includes(kw);
      const matchType = tf === 'ALL' || t.taskType === tf;
      return matchKw && matchType;
    });
    this.setData({ displayTasks });
  },

  onSearch(e: any) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },

  onTypeFilter(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ typeFilter: this.data.typeValues[index] });
    this.applyFilter();
  },

  goForm() {
    wx.navigateTo({ url: '/pages/parent/task-form/index' });
  },

  async cancel(e: any) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({ title: '取消任务', content: '确定取消该任务？' });
    if (!res.confirm) return;
    try {
      await api.del(`/tasks/${id}`);
      wx.showToast({ title: '已取消', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  edit(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/parent/task-form/index?id=${id}` });
  },

  async remove(e: any) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({ title: '删除任务', content: '删除后该任务及其所有实例将不可恢复，确定删除？' });
    if (!res.confirm) return;
    try {
      await api.del(`/tasks/${id}`);
      wx.showToast({ title: '已删除', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },
});
