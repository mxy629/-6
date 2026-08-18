const ICON_MAP: Record<string, string> = {
  // TabBar
  home: '🏠',
  task: '📝',
  review: '🔍',
  reward: '🎁',
  profile: '👤',
  points: '⭐',

  // 任务类型
  study: '📖',
  housework: '🧹',
  sport: '🏃',
  habit: '🌱',
  daily: '🌟',
  other: '📌',

  // 状态
  check: '✅',
  clock: '⏰',
  fire: '🔥',
  trophy: '🏆',
  star: '⭐',
  gift: '🎁',
  calendar: '📅',
  camera: '📷',
  note: '📝',
  warning: '⚠️',
  close: '❌',
  arrow: '›',
  arrowRight: '›',
  add: '+',
  minus: '-',
  empty: '📭',
  seed: '🌱',
  medal: '🥇',
};

Component({
  properties: {
    name: { type: String, value: '' },
    size: { type: String, value: 'md' },
    color: { type: String, value: '' },
  },
  data: {
    icon: '',
    sizeClass: 'icon-md',
  },
  observers: {
    name(val: string) {
      this.setData({ icon: ICON_MAP[val] || ICON_MAP[val.toLowerCase()] || val });
    },
    size(val: string) {
      this.setData({ sizeClass: `icon-${val}` });
    },
  },
});
