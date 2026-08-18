import { api } from '../../../services/request';
import { formatDate } from '../../../utils/format';
import { PointsLedgerDto } from '../../../types';

interface LedgerItem extends PointsLedgerDto {
  amountText: string;
  timeText: string;
}

Page({
  data: {
    loading: true,
    balance: 0,
    ledger: [] as LedgerItem[],
  },

  onShow() {
    this.load(false);
  },

  async load(force = true) {
    if (force || !this.data.ledger.length) this.setData({ loading: true });
    try {
      const [b, list] = await Promise.all([
        api.get<{ balance: number }>('/points/balance'),
        api.get<PointsLedgerDto[]>('/points/ledger'),
      ]);
      const ledger = (list || []).map((l) => ({
        ...l,
        amountText: l.amount > 0 ? `+${l.amount}` : `${l.amount}`,
        timeText: formatDate(l.createdAt),
      }));
      this.setData({ balance: b.balance, ledger, loading: false });
    } catch (e: any) {
      if (force) wx.showToast({ title: e.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },
});
