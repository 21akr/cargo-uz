import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService).get<AppConfig>('app')!;

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableCors({ origin: cfg.corsOrigins.length ? cfg.corsOrigins : true });
  app.enableShutdownHooks();

  await app.listen(cfg.port);
  new Logger('Bootstrap').log(`API on http://localhost:${cfg.port}`);
}

bootstrap();
