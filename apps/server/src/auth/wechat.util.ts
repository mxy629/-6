import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 微信登录工具。
 * 生产环境应调用微信 code2Session 接口换取 openid；
 * 开发环境若无 appid/secret，则把 code 直接当作稳定的 openid 使用，方便联调。
 */
@Injectable()
export class WechatUtil {
  constructor(private readonly config: ConfigService) {}

  async codeToOpenId(code: string): Promise<string> {
    const appid = this.config.get<string>('WECHAT_APPID');
    const secret = this.config.get<string>('WECHAT_SECRET');
    if (!appid || !secret) {
      // 本地开发：固定映射到稳定的开发家长 openId，避免每次 wx.login 都新建空家长，
      // 导致重编译/重登录后之前创建的孩子与任务“消失”（数据其实在另一个一次性账号下）。
      // 预览页传入 seed_parent 时仍对应种子家长，保持演示数据可用。
      if (code === 'seed_parent') return 'dev_openid_seed_parent';
      return 'dev_openid_dev_parent';
    }
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const res = await fetch(url);
    const json = (await res.json()) as { openid?: string; errcode?: number; errmsg?: string };
    if (!json.openid) {
      throw new Error(json.errmsg || '微信登录失败');
    }
    return json.openid;
  }
}
