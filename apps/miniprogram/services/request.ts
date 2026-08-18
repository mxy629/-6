import { store } from '../stores/app';

// 后端地址：开发阶段指向本地服务；真机调试/预览时改为电脑局域网 IP；上线后改为你的域名
// 注意：局域网 IP 会随 Wi-Fi/网络变化而改变，连不上时请 `ipconfig` 查当前 IPv4 并更新此处。
export const BASE_URL = 'http://192.168.110.117:3000/api/v1';

interface ApiResult<T> {
  success: boolean;
  data: T;
  message: string;
  code?: string;
}

export function request<T = any>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  data?: Record<string, any>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${path}`,
      method: method as WechatMiniprogram.RequestOption['method'],
      data,
      header: {
        'Content-Type': 'application/json',
        ...(store.getToken() ? { Authorization: `Bearer ${store.getToken()}` } : {}),
      },
      success: (res: any) => {
        const body = res.data as ApiResult<T>;
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success) {
          resolve(body.data);
        } else if (res.statusCode === 401) {
          store.logout();
          reject(new Error(body?.message || '未登录'));
        } else {
          reject(new Error(body?.message || `请求失败(${res.statusCode})`));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络错误'));
      },
    });
  });
}

// 轻量级 GET 缓存：相同请求在 TTL 内直接返回内存结果，配合页面“已有数据静默刷新”
// 的策略，可以让切换 tab / 返回列表时瞬间呈现（无需等待网络与转圈）。
const GET_TTL = 4000;
const cache = new Map<string, { value: any; expires: number }>();

function invalidateCache() {
  cache.clear();
}

export const api = {
  get: <T = any>(path: string, opts?: { force?: boolean }) => {
    const key = `GET ${path}`;
    if (!opts?.force) {
      const hit = cache.get(key);
      if (hit && hit.expires > Date.now()) {
        return Promise.resolve(hit.value as T);
      }
    }
    return request<T>('GET', path).then((value) => {
      cache.set(key, { value, expires: Date.now() + GET_TTL });
      return value;
    });
  },
  post: <T = any>(path: string, data?: Record<string, any>) =>
    request<T>('POST', path, data).then((v) => {
      invalidateCache();
      return v;
    }),
  patch: <T = any>(path: string, data?: Record<string, any>) =>
    request<T>('PATCH', path, data).then((v) => {
      invalidateCache();
      return v;
    }),
  del: <T = any>(path: string) =>
    request<T>('DELETE', path).then((v) => {
      invalidateCache();
      return v;
    }),
  clearCache: invalidateCache,
};
