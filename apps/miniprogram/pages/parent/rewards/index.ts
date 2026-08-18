import { api } from '../../../services/request';
import { RewardDto } from '../../../types';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  ACTIVE: '上架中',
  INACTIVE: '已下架',
};

const STATUS_VALUES = ['ALL', 'DRAFT', 'ACTIVE', 'INACTIVE'];
const STATUS_TEXTS = ['全部', '草稿', '上架中', '已下架'];

interface RewardView extends RewardDto {
  statusText: string;
}

Page({
  data: {
    loading: true,
    rewards: [] as RewardView[],
    displayRewards: [] as RewardView[],
    keyword: '' as string,
    statusFilter: 'ALL' as string,
    statusValues: STATUS_VALUES,
    statusLabels: STATUS_TEXTS,
    showForm: false,
    submitting: false,
    editingId: '' as string,
    form: { name: '', description: '', pointsCost: 100, stock: 1 },
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.rewards.length) this.setData({ loading: true });
    try {
      const list = await api.get<RewardDto[]>('/rewards');
      const rewards = list.map((r) => ({ ...r, statusText: STATUS_LABEL[r.status] || r.status }));
      this.setData({ rewards });
      this.applyFilter();
      this.setData({ loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  applyFilter() {
    const kw = this.data.keyword.trim().toLowerCase();
    const sf = this.data.statusFilter;
    const displayRewards = this.data.rewards.filter((r) => {
      const matchKw = !kw || r.name.toLowerCase().includes(kw);
      const matchStatus = sf === 'ALL' || r.status === sf;
      return matchKw && matchStatus;
    });
    this.setData({ displayRewards });
  },

  onSearch(e: any) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },

  onStatusFilter(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ statusFilter: this.data.statusValues[index] });
    this.applyFilter();
  },

  toggleForm() {
    this.setData({ showForm: !this.data.showForm });
  },

  onName(e: any) {
    this.setData({ 'form.name': e.detail.value });
  },
  onDesc(e: any) {
    this.setData({ 'form.description': e.detail.value });
  },
  onCost(e: any) {
    this.setData({ 'form.pointsCost': Number(e.detail.value) || 0 });
  },
  onStock(e: any) {
    this.setData({ 'form.stock': Number(e.detail.value) || 0 });
  },

  async submit() {
    if (this.data.submitting) return;
    if (!this.data.form.name.trim()) {
      wx.showToast({ title: '请填写奖励名称', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      if (this.data.editingId) {
        await api.patch(`/rewards/${this.data.editingId}`, { ...this.data.form });
        wx.showToast({ title: '已保存', icon: 'success' });
      } else {
        await api.post('/rewards', { ...this.data.form });
        wx.showToast({ title: '已存为草稿', icon: 'success' });
      }
      this.resetForm();
      this.load(false);
    } catch (e: any) {
      wx.showToast({ title: e.message, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  resetForm() {
    this.setData({
      showForm: false,
      editingId: '',
      form: { name: '', description: '', pointsCost: 100, stock: 1 },
    });
  },

  async publish(e: any) {
    const id = e.currentTarget.dataset.id;
    try {
      await api.post(`/rewards/${id}/publish`, {});
      wx.showToast({ title: '已上架', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  async remove(e: any) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({
      title: '下架奖励',
      content: '下架后孩子端不可见，可重新编辑后再上架。',
    });
    if (!res.confirm) return;
    try {
      await api.del(`/rewards/${id}`);
      wx.showToast({ title: '已下架', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  async edit(e: any) {
    const id = e.currentTarget.dataset.id;
    try {
      const r = await api.get<RewardDto>(`/rewards/${id}`);
      this.setData({
        editingId: id,
        showForm: true,
        form: {
          name: r.name,
          description: r.description || '',
          pointsCost: r.pointsCost,
          stock: r.stock,
        },
      });
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  async onDelete() {
    const id = this.data.editingId;
    if (!id) return;
    const res = await wx.showModal({
      title: '删除奖励',
      content: '删除后不可恢复，确定继续吗？',
      confirmColor: '#FF6B6B',
    });
    if (!res.confirm) return;
    try {
      await api.del(`/rewards/${id}/permanent`);
      wx.showToast({ title: '已删除', icon: 'success' });
      this.resetForm();
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },
});
