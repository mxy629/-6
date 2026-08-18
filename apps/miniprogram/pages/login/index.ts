import { api } from '../../services/request';
import { store } from '../../stores/app';

const PHONE_RE = /^1\d{10}$/;
const CODE_RE = /^\d{6}$/;

Page({
  data: {
    mode: 'parent' as 'parent' | 'child',
    loginName: '',
    pin: '',
    loading: false,
    showConsent: false,
    // 家长子模式：微信 / 手机号
    parentSub: 'wechat' as 'wechat' | 'phone',
    phoneMode: 'login' as 'login' | 'register',
    phone: '',
    code: '',
    nickname: '',
    countdown: 0,
    timerId: 0 as any,
  },

  onUnload() {
    if (this.data.timerId) {
      clearInterval(this.data.timerId);
      this.setData({ timerId: 0 });
    }
  },

  switchMode(e: any) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },

  switchParentSub(e: any) {
    this.setData({ parentSub: e.currentTarget.dataset.sub });
  },

  switchPhoneMode(e: any) {
    this.setData({ phoneMode: e.currentTarget.dataset.m });
  },

  onLoginName(e: any) {
    this.setData({ loginName: e.detail.value });
  },

  onPin(e: any) {
    this.setData({ pin: e.detail.value });
  },

  onPhone(e: any) {
    this.setData({ phone: e.detail.value });
  },

  onCode(e: any) {
    this.setData({ code: e.detail.value });
  },

  onNickname(e: any) {
    this.setData({ nickname: e.detail.value });
  },

  onParentLogin() {
    if (this.data.loading) return;
    // 先询问是否授权使用微信头像与昵称
    this.setData({ showConsent: true });
  },

  onConsentDecline() {
    this.setData({ showConsent: false });
  },

  async onConsentAgree() {
    this.setData({ showConsent: false, loading: true });
    try {
      // 1) 自动获取微信头像与昵称（用于家长端身份展示）
      let nickname = '';
      let avatarUrl = '';
      try {
        const prof = await this.getWechatProfile();
        nickname = prof.userInfo.nickName;
        avatarUrl = prof.userInfo.avatarUrl;
      } catch (e) {
        // 用户拒绝授权或接口不可用：仅用 code 登录，无头像昵称
      }
      // 2) 换取登录凭证并登录（携带头像昵称，后端按 openId 持久化）
      const { code } = await wx.login();
      const body: { code: string; nickname?: string; avatarUrl?: string } = { code };
      if (nickname) body.nickname = nickname;
      if (avatarUrl) body.avatarUrl = avatarUrl;
      const res = await api.post<{ accessToken: string; user: any }>('/auth/wechat', body);
      store.setAuth(res.accessToken, res.user);
      wx.reLaunch({ url: '/pages/parent/home/index' });
    } catch (err: any) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  getWechatProfile(): Promise<{ userInfo: { nickName: string; avatarUrl: string } }> {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于展示你的家长身份',
        success: resolve as any,
        fail: reject,
      });
    });
  },

  async onChildLogin() {
    if (this.data.loading) return;
    if (!this.data.loginName || !this.data.pin) {
      wx.showToast({ title: '请输入账号和PIN', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await api.post<{ accessToken: string; user: any }>('/auth/child-login', {
        loginName: this.data.loginName,
        pin: this.data.pin,
      });
      store.setAuth(res.accessToken, res.user);
      wx.reLaunch({ url: '/pages/child/home/index' });
    } catch (err: any) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onSendCode() {
    const phone = this.data.phone.trim();
    if (!PHONE_RE.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (this.data.countdown > 0) return;
    try {
      const res = await api.post<{ message: string; devCode?: string }>('/auth/send-code', {
        phone,
        purpose: this.data.phoneMode === 'register' ? 'REGISTER' : 'LOGIN',
      });
      if (res.devCode) {
        wx.showToast({ title: `验证码：${res.devCode}`, icon: 'none', duration: 2500 });
      } else {
        wx.showToast({ title: '验证码已发送', icon: 'success' });
      }
      this.startCountdown();
    } catch (err: any) {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    }
  },

  startCountdown() {
    this.setData({ countdown: 60 });
    const id = setInterval(() => {
      const c = this.data.countdown - 1;
      if (c <= 0) {
        clearInterval(id);
        this.setData({ countdown: 0, timerId: 0 });
      } else {
        this.setData({ countdown: c });
      }
    }, 1000);
    this.setData({ timerId: id });
  },

  async onPhoneSubmit() {
    if (this.data.loading) return;
    const phone = this.data.phone.trim();
    const code = this.data.code.trim();
    if (!PHONE_RE.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (!CODE_RE.test(code)) {
      wx.showToast({ title: '请输入6位验证码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const isRegister = this.data.phoneMode === 'register';
      const path = isRegister ? '/auth/register' : '/auth/phone-login';
      const body = isRegister
        ? { phone, code, nickname: this.data.nickname.trim() }
        : { phone, code };
      const res = await api.post<{ accessToken: string; user: any }>(path, body);
      store.setAuth(res.accessToken, res.user);
      wx.reLaunch({ url: '/pages/parent/home/index' });
    } catch (err: any) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
