import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { BatchPostParser, ParsedBatch } from './parser/batch-post.parser';
import { BATCH_STATUS_CHANGED, BatchStatus, BatchStatusChangedEvent } from '../common/status';
import type { AppConfig } from '../config/configuration';

export interface IngestResult {
  changed: boolean;
  batchNo: string;
  status: BatchStatus | null;
  previous?: BatchStatus | null;
}

@Injectable()
export class IngestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestService.name);
  private client: any = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly parser: BatchPostParser,
    private readonly events: EventEmitter2,
  ) {}

  async onModuleInit() {
    const app = this.config.get<AppConfig>('app')!;
    if (!app.mtproto) {
      this.logger.warn('MTProto ingest disabled (no TG_API_ID/HASH/SESSION) — API-only mode.');
      return;
    }
    if (!app.channels.length) {
      this.logger.warn('No INGEST_CHANNELS configured — ingest idle.');
      return;
    }

    try {
      // Lazy import so the (heavy) GramJS module only loads when creds exist.
      const { TelegramClient } = await import('telegram');
      const { StringSession } = await import('telegram/sessions');
      const { NewMessage } = await import('telegram/events');

      this.client = new TelegramClient(
        new StringSession(app.mtproto.session),
        app.mtproto.apiId,
        app.mtproto.apiHash,
        { connectionRetries: 5 },
      );
      await this.client.connect();
      this.logger.log('MTProto connected');

      for (const { carrier, channel } of app.channels) {
        try {
          const entity = await this.client.getEntity(channel);
          // Per-channel handler: carrier is captured in the closure, so we never
          // have to reverse a chat id back to a carrier.
          this.client.addEventHandler(
            (event: any) => this.onMessage(carrier, event),
            new NewMessage({ chats: [entity] }),
          );
          this.logger.log(`Listening: ${carrier} -> ${channel}`);
        } catch (e) {
          this.logger.error(`Cannot resolve ${channel} (${carrier}): ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`MTProto init failed: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.client?.disconnect();
    } catch {
      /* noop */
    }
  }

  private async onMessage(carrier: string, event: any) {
    const text: string = event?.message?.message ?? '';
    if (!text) return;
    const msgId = event?.message?.id != null ? String(event.message.id) : undefined;
    for (const p of this.parser.parse(text)) {
      if (p.status) await this.ingestOne(carrier, p, msgId);
    }
  }

  /** Upsert one parsed batch and emit an event if its status actually changed.
   *  Shared by the live MTProto handler and the /ingest/simulate endpoint. */
  async ingestOne(carrier: string, p: ParsedBatch, sourceMsgId?: string): Promise<IngestResult> {
    if (!p.status) return { changed: false, batchNo: p.batchNo, status: null };

    const existing = await this.prisma.batchStatusRecord.findUnique({
      where: { carrier_batchNo: { carrier, batchNo: p.batchNo } },
    });
    const previous = (existing?.status as BatchStatus | undefined) ?? null;

    await this.prisma.batchStatusRecord.upsert({
      where: { carrier_batchNo: { carrier, batchNo: p.batchNo } },
      update: { status: p.status, transport: p.transport, rawText: p.raw, sourceMsgId },
      create: {
        carrier,
        batchNo: p.batchNo,
        transport: p.transport,
        status: p.status,
        rawText: p.raw,
        sourceMsgId,
      },
    });

    const changed = previous !== p.status;
    if (changed) {
      const payload: BatchStatusChangedEvent = {
        carrier,
        batchNo: p.batchNo,
        transport: p.transport,
        status: p.status,
        previous,
      };
      this.events.emit(BATCH_STATUS_CHANGED, payload);
      this.logger.log(`${carrier} ${p.batchNo}: ${previous ?? '—'} -> ${p.status}`);
    }
    return { changed, previous, status: p.status, batchNo: p.batchNo };
  }

  /** Dev/admin: run the full parse→upsert→notify pipeline on a pasted post. */
  async simulate(carrier: string, text: string) {
    const parsed = this.parser.parse(text);
    const results: IngestResult[] = [];
    for (const p of parsed) {
      results.push(await this.ingestOne(carrier, p));
    }
    return { carrier, parsedCount: parsed.length, results };
  }
}
