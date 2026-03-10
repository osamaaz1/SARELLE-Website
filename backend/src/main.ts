import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CacheHeadersInterceptor } from './interceptors/cache-headers.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : (origin, callback) => {
          // Allow localhost and any private/LAN IP during development
          if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) {
            callback(null, true);
          } else {
            callback(new Error('CORS blocked'));
          }
        },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new CacheHeadersInterceptor());
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  Logger.log(`WIMC Backend running on port ${port}`, 'Bootstrap');
}
bootstrap();
