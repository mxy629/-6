import { store } from './stores/app';
import { shareHandlers } from './utils/share';

// 全局注入分享能力：所有页面默认支持转发/分享朋友圈，
// 页面自身若定义了 onShareAppMessage / onShareTimeline 则会覆盖默认值。
const _Page = Page;
(globalThis as any).Page = (options: any) => {
  return _Page({ ...shareHandlers, ...options });
};

App({
  globalData: {
    store,
  },
  onLaunch() {
    store.init();
  },
});
