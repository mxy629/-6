import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { WechatUtil } from './wechat.util';
import { SmsService } from '../sms/sms.service';
import { ErrorCode } from '../common/exceptions';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly wechat: WechatUtil,
    private readonly sms: SmsService,
  ) {}

  private signToken(userId: string, role: 'PARENT' | 'CHILD') {
    return this.jwt.signAsync({ userId, role });
  }

  async wechatLogin(code: string, nickname?: string, avatarUrl?: string) {
    const openId = await this.wechat.codeToOpenId(code);
    let user = await this.prisma.user.findUnique({ where: { wechatOpenId: openId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          role: 'PARENT',
          nickname: nickname || '家长',
          wechatOpenId: openId,
          avatarUrl: avatarUrl || null,
        },
      });
    } else {
      // 已存在：刷新微信昵称/头像，保持家长端左上角身份展示为最新
      const update: { nickname?: string; avatarUrl?: string | null } = {};
      if (nickname) update.nickname = nickname;
      if (avatarUrl) update.avatarUrl = avatarUrl;
      if (Object.keys(update).length) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: update });
      }
    }
    if (user.role !== 'PARENT') {
      throw new UnauthorizedException({
        success: false,
        code: ErrorCode.FORBIDDEN,
        message: '该微信账号不是家长账号',
      });
    }
    const token = await this.signToken(user.id, 'PARENT');
    return { accessToken: token, user: this.toUserDto(user) };
  }

  async childLogin(loginName: string, pin: string) {
    const profile = await this.prisma.childProfile.findFirst({
      where: { loginName },
      include: { user: true },
    });
    if (!profile) {
      throw new UnauthorizedException({
        success: false,
        code: ErrorCode.CHILD_NOT_FOUND,
        message: '孩子账号不存在',
      });
    }
    const ok = await bcrypt.compare(pin, profile.pinPasswordHash);
    if (!ok) {
      throw new UnauthorizedException({
        success: false,
        code: ErrorCode.FORBIDDEN,
        message: 'PIN 错误',
      });
    }
    const token = await this.signToken(profile.userId, 'CHILD');
    return { accessToken: token, user: this.toUserDto(profile.user) };
  }

  // ---- 手机号 + 验证码（仅家长） ----

  async sendCode(phone: string, purpose: 'REGISTER' | 'LOGIN') {
    const { devCode } = await this.sms.sendCode(phone, purpose);
    return { message: '验证码已发送', devCode };
  }

  async register(phone: string, code: string, nickname: string) {
    await this.sms.verifyCode(phone, 'REGISTER', code);
    const existed = await this.prisma.user.findUnique({ where: { phone } });
    if (existed) {
      throw new BadRequestException({
        success: false,
        code: ErrorCode.PHONE_ALREADY_REGISTERED,
        message: '该手机号已注册，请直接登录',
      });
    }
    const user = await this.prisma.user.create({
      data: { role: 'PARENT', nickname: nickname || '家长', phone },
    });
    const token = await this.signToken(user.id, 'PARENT');
    return { accessToken: token, user: this.toUserDto(user) };
  }

  async phoneLogin(phone: string, code: string) {
    await this.sms.verifyCode(phone, 'LOGIN', code);
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      // 登录即注册：验证码通过但未注册则自动建号
      user = await this.prisma.user.create({ data: { role: 'PARENT', nickname: '家长', phone } });
    }
    const token = await this.signToken(user.id, 'PARENT');
    return { accessToken: token, user: this.toUserDto(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        code: ErrorCode.UNAUTHORIZED,
        message: '用户不存在',
      });
    }
    return this.toUserDto(user);
  }

  private toUserDto(user: { id: string; role: string; nickname: string; avatarUrl?: string | null }) {
    return { id: user.id, role: user.role, nickname: user.nickname, avatarUrl: user.avatarUrl ?? '' };
  }
}
