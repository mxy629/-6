Component({
  properties: {
    title: { type: String, value: '' },
    extra: { type: String, value: '' },
    showArrow: { type: Boolean, value: false },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap');
    },
  },
});
