import { store } from '../../stores/app';

const CHILD_TABS = [
  { key: 'home', label: '首页', page: '/pages/child/home/index', icon: 'home' },
  { key: 'tasks', label: '任务', page: '/pages/child/tasks/index', icon: 'task' },
  { key: 'points', label: '积分', page: '/pages/child/points/index', icon: 'points' },
  { key: 'rewards', label: '奖品', page: '/pages/child/rewards/index', icon: 'reward' },
  { key: 'profile', label: '我的', page: '/pages/child/profile/index', icon: 'profile' },
];

const PARENT_TABS = [
  { key: 'home', label: '首页', page: '/pages/parent/home/index', icon: 'home' },
  { key: 'tasks', label: '任务', page: '/pages/parent/tasks/index', icon: 'task' },
  { key: 'reviews', label: '审核', page: '/pages/parent/reviews/index', icon: 'review' },
  { key: 'rewards', label: '奖品', page: '/pages/parent/rewards/index', icon: 'reward' },
  { key: 'profile', label: '我的', page: '/pages/parent/profile/index', icon: 'profile' },
];

Component({
  properties: {
    role: { type: String, value: 'CHILD' },
    active: { type: String, value: '' },
    badges: { type: Object, value: { reviews: 0, rewards: 0 } },
  },
  data: {
    tabs: [] as Array<{ key: string; label: string; page: string; icon: string }>,
  },
  observers: {
    role(val: string) {
      this.setData({ tabs: val === 'PARENT' ? PARENT_TABS : CHILD_TABS });
    },
  },
  pageLifetimes: {
    show() {
      this.setData({ badges: store.badges });
    },
  },
  methods: {
    onTap(e: any) {
      const page = e.currentTarget.dataset.page as string;
      const key = e.currentTarget.dataset.key as string;
      if (key === this.data.active) return;
      wx.redirectTo({ url: page });
    },
  },
});
