const COLOR_MAP: Record<string, { color: string; bg: string }> = {
  PENDING: { color: '#42a5f5', bg: '#EDF5FF' },
  SUBMITTED: { color: '#FF9F43', bg: '#FFF4E6' },
  APPROVED: { color: '#34B368', bg: '#E8F8EF' },
  REJECTED: { color: '#FF6B6B', bg: '#FFEBEB' },
  EXPIRED: { color: '#999999', bg: '#F5F5F5' },
  CANCELLED: { color: '#999999', bg: '#F5F5F5' },
  FULFILLED: { color: '#34B368', bg: '#E8F8EF' },
  REDEMPTION_PENDING: { color: '#FF9F43', bg: '#FFF4E6' },
  REDEMPTION_APPROVED: { color: '#4D96FF', bg: '#EDF5FF' },
  REDEMPTION_REJECTED: { color: '#FF6B6B', bg: '#FFEBEB' },
};

Component({
  properties: {
    status: { type: String, value: '' },
    text: { type: String, value: '' },
    size: { type: String, value: 'md' },
  },
  data: {
    style: '',
  },
  observers: {
    status(val: string) {
      const c = COLOR_MAP[val] || { color: '#999999', bg: '#F5F5F5' };
      this.setData({ style: `background:${c.bg};color:${c.color};` });
    },
  },
});
