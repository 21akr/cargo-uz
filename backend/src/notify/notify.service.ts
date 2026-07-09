import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { BATCH_STATUS_CHANGED, BatchStatusChangedEvent, STATUS_LABEL_RU } from '../common/status';
import type { AppConfig } from '../config/configuration';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent(BATCH_STATUS_CHANGED)
  async onBatchStatusChanged(e: BatchStatusChangedEvent) {
    // Reverse lookup: everyone watching this (carrier, batchNo).
    const watchers = await this.prisma.userBatch.findMany({
      where: { carrier: e.carrier, batchNo: e.batchNo },
      include: { user: true },
    });
    if (!watchers.length) return;

    const label = STATUS_LABEL_RU[e.status] ?? e.status;
    const text = `📦 ${e.carrier} · ${e.batchNo}\nНовый статус: ${label}`;

    await Promise.all(watchers.map((w) => this.send(w.user.tgUserId, text)));
    this.logger.log(`Notified ${watchers.length} watcher(s): ${e.carrier} ${e.batchNo} -> ${e.status}`);
  }

  private async send(tgUserId: bigint, text: string) {
    const token = this.config.get<AppConfig>('app')!.botToken;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN unset — cannot push.');
      return;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgUserId.toString(), text }),
      });
      if (!res.ok) this.logger.warn(`sendMessage failed (${res.status}) for ${tgUserId}`);
    } catch (err) {
      this.logger.error(`push failed for ${tgUserId}: ${(err as Error).message}`);
    }
  }
}
