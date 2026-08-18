import { AuthUser } from '../types';

const TOKEN_KEY = 'gp_token';
const USER_KEY = 'gp_user';

class AppStore {
  token = '';
  user: AuthUser | null = null;
  // 家长端底部 Tab 红点：审核(待审核任务数) / 奖品(待确认兑换数)
  badges = { reviews: 0, rewards: 0 };

  init() {
    this.token = wx.getStorageSync(TOKEN_KEY) || '';
    this.user = wx.getStorageSync(USER_KEY) || null;
  }

  setBadges(badges: { reviews?: number; rewards?: number }) {
    this.badges = {
      reviews: badges.reviews ?? 0,
      rewards: badges.rewards ?? 0,
    };
  }

  setAuth(token: string, user: AuthUser) {
    this.token = token;
    this.user = user;
    wx.setStorageSync(TOKEN_KEY, token);
    wx.setStorageSync(USER_KEY, user);
  }

  getToken() {
    return this.token;
  }

  isLogin() {
    return !!this.token;
  }

  isParent() {
    return this.user?.role === 'PARENT';
  }

  isChild() {
    return this.user?.role === 'CHILD';
  }

  logout() {
    this.token = '';
    this.user = null;
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(USER_KEY);
    wx.reLaunch({ url: '/pages/login/index' });
  }
}

export const store = new AppStore();
