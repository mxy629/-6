import { store } from '../../stores/app';

Component({
  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
    light: { type: Boolean, value: true },
  },
  data: {
    statusBarHeight: 20,
    user: { nickname: '家长', avatarUrl: '' } as any,
    defaultAvatar: '🌱',
  },
  lifetimes: {
    attached() {
      const w: any = (wx as any).getWindowInfo
        ? (wx as any).getWindowInfo()
        : wx.getSystemInfoSync();
      this.setData({ statusBarHeight: w.statusBarHeight || 20 });
      this.refreshUser();
    },
  },
  pageLifetimes: {
    show() {
      this.refreshUser();
    },
  },
  methods: {
    refreshUser() {
      const u = store.user;
      this.setData({
        user: u
          ? { nickname: u.nickname, avatarUrl: u.avatarUrl }
          : { nickname: '家长', avatarUrl: '' },
      });
    },
    onBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.reLaunch({ url: '/pages/parent/home/index' });
      }
    },
  },
});
