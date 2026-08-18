import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './current-user.decorator';
import { ErrorCode } from './exceptions';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.authorization as string | undefined;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        code: ErrorCode.UNAUTHORIZED,
        message: '未登录或登录已过期',
      });
    }
    const token = header.slice(7);
    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token);
      request.user = { userId: payload.userId, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException({
        success: false,
        code: ErrorCode.UNAUTHORIZED,
        message: '登录已失效，请重新登录',
      });
    }
  }
}

@Injectable()
export class ParentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user || user.role !== 'PARENT') {
      throw new UnauthorizedException({
        success: false,
        code: ErrorCode.FORBIDDEN,
        message: '仅家长可操作',
      });
    }
    return true;
  }
}

@Injectable()
export class ChildGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user || user.role !== 'CHILD') {
      throw new UnauthorizedException({
        success: false,
        code: ErrorCode.FORBIDDEN,
        message: '仅孩子可操作',
      });
    }
    return true;
  }
}
