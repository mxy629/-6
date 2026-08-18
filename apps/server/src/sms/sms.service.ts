import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { ErrorCode } from '../common/exceptions';
import { MockSmsProvider, SmsProvider } from './sms.interface';
import { TencentSmsProvider } from './sms.tencent';

const CODE_TTL_MS = 5 * 60 * 1000; // 验证码有效期 5 分钟
const RATE_LIMIT_MS = 60 * 1000; // 同一号码/用途 60 秒内不可重复发送

@Injectable()
export class SmsService {
  // 工厂选择：SMS_PROVIDER=tencent 走真实短信（密钥缺失会启动即报错）；其余走 Mock。
  private readonly provider: SmsProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.provider = this.createProvider();
  }

  private createProvider(): SmsProvider {
    const type = (this.config.get<string>('SMS_PROVIDER') || 'mock').trim().toLowerCase();
    if (type === 'tencent') {
      return new TencentSmsProvider(this.config);
    }
    if (type !== 'mock') {
      // eslint-disable-next-line no-console
      console.warn(`[SMS] 未知的 SMS_PROVIDER="${type}"，已回退为 mock。可选值：mock | tencent`);
    }
    return new MockSmsProvider();
  }

  private isValidPhone(phone: string): boolean {
    return /^1[3-9]\d{9}$/.test(phone);
  }

  /** 生成并发送验证码，返回开发期可用的 devCode */
  async sendCode(phone: string, purpose: 'REGISTER' | 'LOGIN'): Promise<{ devCode: string | null }> {
    if (!this.isValidPhone(phone)) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.INVALID_PARAM,
        message: '手机号格式不正确',
      });
    }
    // 限频：60 秒内不重复发送
    const recent = await this.prisma.smsCode.findFirst({
      where: { phone, purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < RATE_LIMIT_MS) {
      throw new ForbiddenException({
        success: false,
        code: ErrorCode.SMS_RATE_LIMIT,
        message: '验证码发送过于频繁，请 60 秒后再试',
      });
    }
    const code = String(crypto.randomInt(100000, 1000000)); // 6 位
    await this.prisma.smsCode.create({
      data: { phone, code, purpose, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });
    const devCode = await this.provider.send(phone, code, purpose);
    return { devCode };
  }

  /** 校验验证码，成功则标记已用 */
  async verifyCode(phone: string, purpose: 'REGISTER' | 'LOGIN', code: string): Promise<void> {
    const record = await this.prisma.smsCode.findFirst({
      where: { phone, purpose, used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.SMS_CODE_INVALID,
        message: '验证码无效或已使用',
      });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.SMS_CODE_EXPIRED,
        message: '验证码已过期，请重新获取',
      });
    }
    if (record.code !== code) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.SMS_CODE_INVALID,
        message: '验证码错误',
      });
    }
    await this.prisma.smsCode.update({ where: { id: record.id }, data: { used: true } });
  }
}
