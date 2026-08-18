const STATUS_COLOR: Record<string, string> = {
  PENDING: '#42a5f5',
  SUBMITTED: '#ff9f43',
  APPROVED: '#34B368',
  REJECTED: '#FF6B6B',
  EXPIRED: '#999999',
  CANCELLED: '#999999',
};

const STATUS_BG: Record<string, string> = {
  PENDING: '#EDF5FF',
  SUBMITTED: '#FFF4E6',
  APPROVED: '#E8F8EF',
  REJECTED: '#FFEBEB',
  EXPIRED: '#F5F5F5',
  CANCELLED: '#F5F5F5',
};

const TYPE_ICON: Record<string, string> = {
  STUDY: '📖',
  HOUSEWORK: '🧹',
  SPORT: '🏃',
  HABIT: '🌱',
  DAILY: '🌟',
  OTHER: '📌',
};

Component({
  properties: {
    title: { type: String, value: '' },
    points: { type: Number, value: 0 },
    status: { type: String, value: '' },
    statusText: { type: String, value: '' },
    instanceId: { type: String, value: '' },
    canAction: { type: Boolean, value: false },
    taskType: { type: String, value: '' },
    deadline: { type: String, value: '' },
    compact: { type: Boolean, value: false },
  },
  data: {
    icon: '📌',
    statusStyle: '',
  },
  observers: {
    status(val: string) {
      const color = STATUS_COLOR[val] || '#999999';
      this.setData({ statusStyle: `background:${STATUS_BG[val] || '#F5F5F5'};color:${color};` });
    },
    taskType(val: string) {
      this.setData({ icon: TYPE_ICON[val] || '📌' });
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { instanceId: this.data.instanceId });
    },
    onAction() {
      this.triggerEvent('action', { instanceId: this.data.instanceId });
    },
  },
});
