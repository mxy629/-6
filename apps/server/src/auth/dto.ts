import { IsString, IsNotEmpty, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  // 微信资料（家长端身份展示用），可选：开发期或未授权时仅用 code 登录
  @IsString()
  @IsOptional()
  @MaxLength(64)
  nickname?: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  avatarUrl?: string;
}

export class ChildLoginDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(32)
  loginName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'PIN 必须是 4-6 位数字' })
  pin: string;
}

export class SendCodeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(REGISTER|LOGIN)$/, { message: 'purpose 必须是 REGISTER 或 LOGIN' })
  purpose: 'REGISTER' | 'LOGIN';
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: '验证码必须是 6 位数字' })
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  nickname?: string;
}

export class PhoneLoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: '验证码必须是 6 位数字' })
  code: string;
}
