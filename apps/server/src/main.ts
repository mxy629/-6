import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors();
  app.useStaticAssets(join(process.cwd(), '..', '..', 'docs'), {
    prefix: '/preview',
    index: 'miniprogram-preview.html',
  });
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`成长星球 API 已启动: http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`小程序预览: http://localhost:${port}/preview`);
}
bootstrap();
