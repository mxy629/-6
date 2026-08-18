import { api } from '../../../services/request';
import { TaskTypeLabel, TaskLabel } from '../../../utils/format';
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
    TaskLabel,
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
      // 立即从本地移除，避免列表刷新前仍显示
      const tasks = this.data.tasks.filter((t) => t.id !== id);
      this.setData({ tasks }, () => this.applyFilter());
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },
});
