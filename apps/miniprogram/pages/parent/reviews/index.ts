import { api } from '../../../services/request';
import { formatDate } from '../../../utils/format';
import { ChildDto } from '../../../types';

interface SubmissionView {
  textProof: string | null;
  images: Array<{ url: string }>;
  rejectReason?: string | null;
  status?: string;
}

interface ReviewItem {
  id: string;
  task: { title: string; rewardPoints: number };
  childId: string;
  childName: string;
  childAvatar: string;
  submittedAt: string;
  submissions: SubmissionView[] | null;
  submission: SubmissionView | null;
}

Page({
  data: {
    loading: true,
    reviews: [] as ReviewItem[],
    childMap: {} as Record<string, { nickname: string; avatarUrl: string }>,
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.reviews.length) this.setData({ loading: true });
    try {
      const [children, list] = await Promise.all([
        api.get<ChildDto[]>('/children'),
        api.get<any[]>('/reviews/tasks'),
      ]);
      const childMap: Record<string, { nickname: string; avatarUrl: string }> = {};
      children.forEach((c) => (childMap[c.id] = { nickname: c.nickname, avatarUrl: c.avatarUrl }));
      const reviews = (list || []).map((r) => {
        const child = childMap[r.childId] || { nickname: '孩子', avatarUrl: '' };
        const submission = r.submissions && r.submissions[0] ? r.submissions[0] : null;
        return {
          ...r,
          childName: child.nickname,
          childAvatar: child.avatarUrl,
          submittedAt: formatDate(r.submittedAt || r.createdAt),
          submission,
        };
      });
      this.setData({ reviews, childMap, loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  async approve(e: any) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.reviews.find((r) => r.id === id);
    if (!item) return;
    const res = await wx.showModal({
      title: '确认通过',
      content: `通过后 ${item.childName} 将获得 ${item.task.rewardPoints} 积分。`,
    });
    if (!res.confirm) return;
    try {
      await api.post(`/task-instances/${id}/approve`);
      wx.showToast({ title: '已通过', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  async reject(e: any) {
    const id = e.currentTarget.dataset.id;
    const r = await wx.showModal({
      title: '驳回任务',
      editable: true,
      placeholderText: '填写驳回原因（选填）',
    });
    if (!r.confirm) return;
    try {
      await api.post(`/task-instances/${id}/reject`, { reason: r.content || undefined });
      wx.showToast({ title: '已驳回', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },
});
