import { api } from '../../../services/request';
import { store } from '../../../stores/app';
import { PointsLedgerDto } from '../../../types';

Page({
  data: {
    loading: true,
    loaded: false,
    nickname: '',
    balance: 0,
    totalEarned: 0,
    completed: 0,
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.loaded) this.setData({ loading: true, nickname: store.user?.nickname || '' });
    try {
      const [b, ledger, tasks] = await Promise.all([
        api.get<{ balance: number }>('/points/balance'),
        api.get<PointsLedgerDto[]>('/points/ledger'),
        api.get<Array<{ status: string }>>('/child/tasks'),
      ]);
      const totalEarned = (ledger || [])
        .filter((l) => l.amount > 0)
        .reduce((s, l) => s + l.amount, 0);
      const completed = (tasks || []).filter((t) => t.status === 'APPROVED').length;
      this.setData({ balance: b.balance, totalEarned, completed, loaded: true, loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  logout() {
    store.logout();
  },
});
