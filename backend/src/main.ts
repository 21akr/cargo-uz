import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService).get<AppConfig>('app')!;

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({ origin: cfg.corsOrigins.length ? cfg.corsOrigins : true });
  app.enableShutdownHooks();

  const swaggerCfg = new DocumentBuilder()
    .setTitle('cargo-uz API')
    .setDescription('Tracking, channel ingest, and flights board for the China → Uzbekistan route.')
    .setVersion('0.1')
    .addApiKey(
      { type: 'apiKey', name: 'Authorization', in: 'header', description: 'Telegram Mini App auth: "tma <initData>"' },
      'tma',
    )
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerCfg));

  await app.listen(cfg.port);
  const log = new Logger('Bootstrap');
  log.log(`API on http://localhost:${cfg.port}`);
  log.log(`Swagger on http://localhost:${cfg.port}/docs`);
}

bootstrap();
