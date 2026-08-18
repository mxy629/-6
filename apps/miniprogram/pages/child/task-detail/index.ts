import { api } from '../../../services/request';
import { TaskStatusLabel } from '../../../utils/format';

interface Detail {
  id: string;
  status: string;
  task: {
    title: string;
    description: string | null;
    rewardPoints: number;
    deadlineAt: string | null;
    requireTextProof: boolean;
    requireImageProof: boolean;
  };
  submissions: Array<{ textProof: string | null; rejectReason: string | null; images: Array<{ url: string }> }>;
}

Page({
  data: {
    instanceId: '',
    loading: true,
    detail: null as Detail | null,
    statusText: '',
    text: '',
    images: [] as string[],
    submitting: false,
    rejectReason: '',
  },

  onLoad(query: any) {
    this.setData({ instanceId: query.instanceId });
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const d = await api.get<Detail>(`/child/tasks/${this.data.instanceId}`);
      const latest = d.submissions[0];
      this.setData({
        detail: d,
        statusText: TaskStatusLabel[d.status] || d.status,
        rejectReason: d.status === 'REJECTED' && latest ? latest.rejectReason || '未通过，请重新提交' : '',
        loading: false,
      });
    } catch (e: any) {
      wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  onText(e: any) {
    this.setData({ text: e.detail.value });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      success: (res) => {
        const paths = res.tempFiles.map((f) => f.tempFilePath);
        this.setData({ images: [...this.data.images, ...paths] });
      },
    });
  },

  removeImage(e: any) {
    const idx = e.currentTarget.dataset.idx;
    const images = this.data.images.filter((_, i) => i !== idx);
    this.setData({ images });
  },

  async submit() {
    if (this.data.submitting) return;
    const d = this.data.detail!;
    if (d.task.requireTextProof && !this.data.text.trim()) {
      wx.showToast({ title: '请填写完成说明', icon: 'none' });
      return;
    }
    if (d.task.requireImageProof && this.data.images.length === 0) {
      wx.showToast({ title: '请上传完成照片', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await api.post(`/task-instances/${this.data.instanceId}/submit`, {
        textProof: this.data.text,
        images: this.data.images,
      });
      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e: any) {
      wx.showToast({ title: e.message, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
