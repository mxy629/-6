// 真实短信 Provider 骨架：腾讯云短信（SMS）。
// 上架前置：配置环境变量并安装 SDK 后即可投递真实验证码。
// 设计原则：
//   - 密钥从环境变量读取（不落地到代码）
//   - 未配置 / SDK 未安装 / 网关失败 均抛出清晰可定位的业务错误，便于快速排障
// 接入步骤（详见 .env.example）：
//   1. 安装 SDK：npm i tencentcloud-sdk-nodejs-sms
//   2. 在 .env 配置 SMS_PROVIDER=tencent 及以下变量：
//      SMS_SECRET_ID / SMS_SECRET_KEY / SMS_SDK_APP_ID / SMS_SIGN / SMS_TEMPLATE_ID

import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { BusinessException, ErrorCode } from '../common/exceptions';
import { SmsProvider } from './sms.interface';

type SmsField = 'secretId' | 'secretKey' | 'sdkAppId' | 'signName' | 'templateId';

/** 必填环境变量 -> 对应实例字段 */
const REQUIRED_ENV: { key: string; field: SmsField }[] = [
  { key: 'SMS_SECRET_ID', field: 'secretId' },
  { key: 'SMS_SECRET_KEY', field: 'secretKey' },
  { key: 'SMS_SDK_APP_ID', field: 'sdkAppId' },
  { key: 'SMS_SIGN', field: 'signName' },
  { key: 'SMS_TEMPLATE_ID', field: 'templateId' },
];

export class TencentSmsProvider implements SmsProvider {
  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly sdkAppId: string;
  private readonly signName: string;
  private readonly templateId: string;
  private readonly region: string;

  constructor(config: ConfigService) {
    this.secretId = (config.get<string>('SMS_SECRET_ID') || '').trim();
    this.secretKey = (config.get<string>('SMS_SECRET_KEY') || '').trim();
    this.sdkAppId = (config.get<string>('SMS_SDK_APP_ID') || '').trim();
    this.signName = (config.get<string>('SMS_SIGN') || '').trim();
    this.templateId = (config.get<string>('SMS_TEMPLATE_ID') || '').trim();
    this.region = (config.get<string>('SMS_REGION') || 'ap-guangzhou').trim();

    // 启动时即校验配置，缺项立即明确报错（fail-fast）
    const missing = REQUIRED_ENV.filter(({ field }) => !this[field]).map(({ key }) => key);
    if (missing.length > 0) {
      throw new BusinessException(
        ErrorCode.SMS_NOT_CONFIGURED,
        `短信服务未配置完整，缺少环境变量：${missing.join('、')}。请参考 apps/server/.env.example 配置腾讯云短信后重试。`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async send(
    phone: string,
    code: string,
    purpose: 'REGISTER' | 'LOGIN',
  ): Promise<string | null> {
    // 懒加载 SDK：避免未安装时拖垮启动
    let tencentcloud: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      tencentcloud = require('tencentcloud-sdk-nodejs-sms');
    } catch {
      throw new BusinessException(
        ErrorCode.SMS_NOT_CONFIGURED,
        '未安装腾讯云短信 SDK，请先执行：npm i tencentcloud-sdk-nodejs-sms',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const client = new tencentcloud.sms.v20210111.Client({
      credential: { secretId: this.secretId, secretKey: this.secretKey },
      region: this.region,
      profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } },
    });

    const params = {
      PhoneNumberSet: [`+86${phone}`],
      SmsSdkAppId: this.sdkAppId,
      SignName: this.signName,
      TemplateId: this.templateId,
      // 模板参数顺序需与腾讯云控制台模板一致；此处首个参数为验证码
      TemplateParamSet: [code],
    };

    try {
      await client.SendSms(params);
    } catch (err: any) {
      // 生产环境应将 err 上报监控；此处抛出清晰业务错误
      throw new BusinessException(
        ErrorCode.SMS_SEND_FAILED,
        `短信网关发送失败（${purpose}）：${err?.message || '未知错误'}`,
      );
    }

    // 真实环境验证码由短信网关投递，不返回明文
    return null;
  }
}
