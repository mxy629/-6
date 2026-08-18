// 短信发送 provider 抽象层。
// 开发期默认使用 MockSmsProvider（验证码直接返回/打印，可立即跑通）；
// 生产环境接入真实短信（腾讯云/阿里云）时，实现 SmsProvider 接口，并在
// SmsService 的工厂选择逻辑中返回该实现即可（见 sms.service.ts）。

export interface SmsProvider {
  /** 发送短信验证码，返回开发期可用的验证码（真实环境返回 null，由短信网关投递） */
  send(phone: string, code: string, purpose: 'REGISTER' | 'LOGIN'): Promise<string | null>;
}

export class MockSmsProvider implements SmsProvider {
  async send(phone: string, code: string, purpose: 'REGISTER' | 'LOGIN'): Promise<string | null> {
    // 开发期：打印到服务端日志，并原样返回，便于预览页直接展示
    // eslint-disable-next-line no-console
    console.log(`[MOCK SMS] -> ${phone} (${purpose}) 验证码: ${code}`);
    return code;
  }
}
