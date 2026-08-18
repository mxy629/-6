// 全局分享配置：由 app.ts 的 Page 包装器注入到每个页面，
// 使所有页面默认支持「转发给好友/群」与「分享到朋友圈」。
// 若某个页面需要自定义分享内容，只需在该页 Page({...}) 中自行定义
// onShareAppMessage / onShareTimeline 即可覆盖此处默认值。

export const SHARE_TITLE = '成长星球 · 和孩子一起打卡成长';

export const shareHandlers = {
  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: 'pages/login/index',
    };
  },
  onShareTimeline() {
    return {
      title: SHARE_TITLE,
      query: '',
    };
  },
};
