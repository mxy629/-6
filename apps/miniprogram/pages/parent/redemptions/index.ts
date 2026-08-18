import { api } from '../../../services/request';
import { formatDate, RedemptionStatusLabel } from '../../../utils/format';
import { RedemptionDto } from '../../../types';

interface RView extends RedemptionDto {
  statusText: string;
  timeText: string;
  childName: string;
}

Page({
  data: {
    loading: true,
    list: [] as RView[],
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.list.length) this.setData({ loading: true });
    try {
      const list = await api.get<RedemptionDto[]>('/redemptions');
      const view = (list || []).map((r) => ({
        ...r,
        statusText: RedemptionStatusLabel[r.status] || r.status,
        timeText: formatDate(r.createdAt),
        childName: r.child?.nickname || '孩子',
      }));
      this.setData({ list: view, loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  async approve(e: any) {
    const id = e.currentTarget.dataset.id;
    try {
      await api.post(`/redemptions/${id}/approve`);
      wx.showToast({ title: '已同意', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  async reject(e: any) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({ title: '拒绝兑换', content: '拒绝后积分将自动退回给孩子。' });
    if (!res.confirm) return;
    try {
      await api.post(`/redemptions/${id}/reject`);
      wx.showToast({ title: '已拒绝，积分已退回', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  async fulfill(e: any) {
    const id = e.currentTarget.dataset.id;
    try {
      await api.post(`/redemptions/${id}/fulfill`);
      wx.showToast({ title: '已完成', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },
});
