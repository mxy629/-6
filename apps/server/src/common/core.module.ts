import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma.module';
import { JwtAuthGuard, ParentGuard, ChildGuard } from './guards';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'growth-planet-dev-secret',
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '7d' },
      }),
    }),
    PrismaModule,
  ],
  providers: [JwtAuthGuard, ParentGuard, ChildGuard],
  exports: [JwtModule, PrismaModule, JwtAuthGuard, ParentGuard, ChildGuard, ConfigModule],
})
export class CoreModule {}
