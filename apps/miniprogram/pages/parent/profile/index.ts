import { api } from '../../../services/request';
import { store } from '../../../stores/app';
import { ChildDto } from '../../../types';

Page({
  data: {
    loading: true,
    nickname: '',
    avatar: '',
    children: [] as ChildDto[],
    showForm: false,
    submitting: false,
    form: { nickname: '', loginName: '', pin: '' },
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.children.length) this.setData({ loading: true });
    this.setData({
      nickname: store.user?.nickname || '家长',
      avatar: store.user?.avatarUrl || '',
    });
    try {
      const list = await api.get<ChildDto[]>('/children');
      this.setData({ children: list, loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  toggleForm() {
    this.setData({ showForm: !this.data.showForm });
  },

  onNick(e: any) {
    this.setData({ 'form.nickname': e.detail.value });
  },
  onLogin(e: any) {
    this.setData({ 'form.loginName': e.detail.value });
  },
  onPin(e: any) {
    this.setData({ 'form.pin': e.detail.value });
  },

  async create() {
    if (this.data.submitting) return;
    const { nickname, loginName, pin } = this.data.form;
    if (!nickname || !loginName || !pin) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await api.post('/children', { nickname, loginName, pin });
      wx.showToast({ title: '孩子已创建', icon: 'success' });
      this.setData({ showForm: false, form: { nickname: '', loginName: '', pin: '' } });
      this.load(false);
    } catch (e: any) {
      wx.showToast({ title: e.message, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  logout() {
    store.logout();
  },

  // 切换家长账号：退出后回到登录页，可选择其他微信或手机号对应的家长账号
  switchAccount() {
    store.logout();
  },

  async editChild(e: any) {
    const id = e.currentTarget.dataset.id;
    const child = this.data.children.find((c) => c.id === id);
    if (!child) return;
    const res = await wx.showModal({
      title: '修改孩子昵称',
      editable: true,
      placeholderText: '请输入新的昵称',
      content: child.nickname,
    });
    if (!res.confirm) return;
    const nickname = (res.content || '').trim();
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    try {
      await api.patch(`/children/${id}`, { nickname });
      wx.showToast({ title: '已保存', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  async deleteChild(e: any) {
    const id = e.currentTarget.dataset.id;
    const child = this.data.children.find((c) => c.id === id);
    const res = await wx.showModal({
      title: '删除孩子账号',
      content: `确定删除「${child ? child.nickname : '该孩子'}」？其任务、积分、兑换记录将一并清除，且不可恢复。`,
    });
    if (!res.confirm) return;
    try {
      await api.del(`/children/${id}`);
      wx.showToast({ title: '已删除', icon: 'success' });
      this.load(false);
    } catch (err: any) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },
});
