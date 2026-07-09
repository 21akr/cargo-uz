import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './common/health.controller';
import { TrackingModule } from './tracking/tracking.module';
import { IngestModule } from './ingest/ingest.module';
import { NotifyModule } from './notify/notify.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    TrackingModule,
    IngestModule,
    NotifyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
