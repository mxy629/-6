Component({
  properties: {
    name: { type: String, value: '' },
    pointsCost: { type: Number, value: 0 },
    remaining: { type: Number, value: 0 },
    imageUrl: { type: String, value: '' },
    rewardId: { type: String, value: '' },
    goal: { type: Boolean, value: false },
    showGoal: { type: Boolean, value: true },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { rewardId: this.data.rewardId });
    },
    onAction() {
      this.triggerEvent('action', { rewardId: this.data.rewardId });
    },
    onSetGoal() {
      this.triggerEvent('setgoal', { rewardId: this.data.rewardId });
    },
  },
});
