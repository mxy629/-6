import { api } from '../../../services/request';

interface LedgerItem {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

Page({
  data: {
    loading: true,
    childId: '' as string,
    balance: 0,
    ledger: [] as LedgerItem[],
  },

  onLoad(options: any) {
    const childId = (options && options.childId) || '';
    this.setData({ childId });
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const [bal, list] = await Promise.all([
        api.get<{ balance: number }>(`/children/${this.data.childId}/points`),
        api.get<LedgerItem[]>(`/children/${this.data.childId}/points/ledger`),
      ]);
      this.setData({ balance: bal.balance, ledger: list, loading: false });
    } catch (e: any) {
      wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },
});
