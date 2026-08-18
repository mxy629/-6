import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';
import { WechatLoginDto, ChildLoginDto, SendCodeDto, RegisterDto, PhoneLoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('wechat')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.auth.wechatLogin(dto.code, dto.nickname, dto.avatarUrl);
  }

  @Post('child-login')
  childLogin(@Body() dto: ChildLoginDto) {
    return this.auth.childLogin(dto.loginName, dto.pin);
  }

  // 手机号 + 验证码（仅家长）
  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendCode(dto.phone, dto.purpose);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.phone, dto.code, dto.nickname || '');
  }

  @Post('phone-login')
  phoneLogin(@Body() dto: PhoneLoginDto) {
    return this.auth.phoneLogin(dto.phone, dto.code);
  }

  @Post('logout')
  logout() {
    return { message: '已退出' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { userId: string }) {
    return this.auth.me(user.userId);
  }
}
