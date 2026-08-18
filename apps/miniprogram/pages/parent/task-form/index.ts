import { api } from '../../../services/request';
import { ChildDto } from '../../../types';

const TASK_TYPES = [
  { value: 'STUDY', label: '学习', icon: '📖' },
  { value: 'HOUSEWORK', label: '家务', icon: '🧹' },
  { value: 'SPORT', label: '运动', icon: '🏃' },
  { value: 'HABIT', label: '习惯', icon: '🌱' },
  { value: 'DAILY', label: '日常', icon: '🌟' },
  { value: 'OTHER', label: '其他', icon: '📌' },
];

const REPEAT_TYPES = [
  { value: 'NONE', label: '不重复' },
  { value: 'DAILY', label: '每天' },
  { value: 'WEEKLY', label: '每周' },
];

Page({
  data: {
    loading: true,
    submitting: false,
    editingId: '' as string,
    children: [] as ChildDto[],
    childIndex: 0,
    title: '',
    description: '',
    rewardPoints: 10,
    taskTypeIndex: 0,
    repeatTypeIndex: 0,
    deadlineTime: '',
    requireText: false,
    requireImage: false,
    taskTypeLabels: TASK_TYPES.map((t) => t.label),
    repeatTypeLabels: REPEAT_TYPES.map((r) => r.label),
    quickPoints: [5, 10, 20, 50],
  },

  async onLoad(options: any) {
    try {
      const children = await api.get<ChildDto[]>('/children');
      const patch: any = { children, loading: false };
      if (children.length === 0) {
        wx.showToast({ title: '请先创建孩子账号', icon: 'none' });
      }
      if (options && options.id) {
        const task = await api.get<any>(`/tasks/${options.id}`);
        patch.editingId = options.id;
        patch.childIndex = Math.max(0, children.findIndex((c) => c.id === task.childId));
        patch.title = task.title;
        patch.description = task.description || '';
        patch.rewardPoints = task.rewardPoints;
        patch.taskTypeIndex = Math.max(0, TASK_TYPES.findIndex((t) => t.value === task.taskType));
        patch.repeatTypeIndex = Math.max(0, REPEAT_TYPES.findIndex((r) => r.value === task.repeatType));
        patch.deadlineTime = task.deadlineTime || '';
        patch.requireText = !!task.requireTextProof;
        patch.requireImage = !!task.requireImageProof;
      }
      this.setData(patch);
    } catch (e: any) {
      wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  onTitle(e: any) { this.setData({ title: e.detail.value }); },
  onDesc(e: any) { this.setData({ description: e.detail.value }); },
  onPoints(e: any) { this.setData({ rewardPoints: Number(e.detail.value) || 0 }); },
  onChild(e: any) { this.setData({ childIndex: Number(e.detail.value) }); },
  onTaskType(e: any) { this.setData({ taskTypeIndex: Number(e.detail.value) }); },
  onRepeat(e: any) { this.setData({ repeatTypeIndex: Number(e.detail.value) }); },
  onDeadline(e: any) { this.setData({ deadlineTime: e.detail.value }); },
  onRequireText(e: any) { this.setData({ requireText: e.detail.value }); },
  onRequireImage(e: any) { this.setData({ requireImage: e.detail.value }); },

  stepPoints(delta: number) {
    const v = Math.max(0, this.data.rewardPoints + delta);
    this.setData({ rewardPoints: v });
  },
  minus() { this.stepPoints(-1); },
  plus() { this.stepPoints(1); },
  setPoints(e: any) {
    const v = Number(e.currentTarget.dataset.v);
    this.setData({ rewardPoints: v });
  },

  async submit() {
    if (this.data.submitting) return;
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请填写任务名称', icon: 'none' });
      return;
    }
    if (this.data.children.length === 0) {
      wx.showToast({ title: '请先创建孩子账号', icon: 'none' });
      return;
    }
    const child = this.data.children[this.data.childIndex];
    const dto = {
      childId: child.id,
      title: this.data.title,
      description: this.data.description,
      rewardPoints: this.data.rewardPoints,
      taskType: TASK_TYPES[this.data.taskTypeIndex].value,
      repeatType: REPEAT_TYPES[this.data.repeatTypeIndex].value,
      deadlineTime: this.data.deadlineTime || undefined,
      requireTextProof: this.data.requireText,
      requireImageProof: this.data.requireImage,
    };
    this.setData({ submitting: true });
    try {
      if (this.data.editingId) {
        await api.patch(`/tasks/${this.data.editingId}`, dto);
        wx.showToast({ title: '已保存', icon: 'success' });
      } else {
        await api.post('/tasks', dto);
        wx.showToast({ title: '发布成功', icon: 'success' });
      }
      setTimeout(() => wx.navigateBack(), 600);
    } catch (e: any) {
      wx.showToast({ title: e.message, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
