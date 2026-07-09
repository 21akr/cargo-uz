import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeBatchNo } from '../common/batch.util';
import type { BatchStatus } from '../common/status';
import { AddParcelDto } from './dto/add-parcel.dto';

type UserBatchWithParcels = {
  id: string;
  carrier: string;
  batchNo: string;
  parcels: { id: string; trackCode: string | null; name: string | null; cost: unknown }[];
};

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve (and lazily create) the app user for a Telegram user id. */
  private async userId(tgUserId: number): Promise<string> {
    const user = await this.prisma.user.upsert({
      where: { tgUserId: BigInt(tgUserId) },
      update: {},
      create: { tgUserId: BigInt(tgUserId) },
    });
    return user.id;
  }

  async registerBatch(tgUserId: number, carrier: string, batchNo: string) {
    const userId = await this.userId(tgUserId);
    const norm = normalizeBatchNo(batchNo);
    const batch = await this.prisma.userBatch.upsert({
      where: { userId_carrier_batchNo: { userId, carrier, batchNo: norm } },
      update: {},
      create: { userId, carrier, batchNo: norm },
      include: { parcels: true },
    });
    const [decorated] = await this.decorate([batch]);
    return decorated;
  }

  async listBatches(tgUserId: number) {
    const userId = await this.userId(tgUserId);
    const batches = await this.prisma.userBatch.findMany({
      where: { userId },
      include: { parcels: true },
      orderBy: { createdAt: 'desc' },
    });
    return this.decorate(batches);
  }

  async deleteBatch(tgUserId: number, id: string) {
    const userId = await this.userId(tgUserId);
    await this.prisma.userBatch.deleteMany({ where: { id, userId } });
    return { ok: true };
  }

  async addParcel(tgUserId: number, batchId: string, dto: AddParcelDto) {
    const userId = await this.userId(tgUserId);
    const batch = await this.prisma.userBatch.findFirst({ where: { id: batchId, userId } });
    if (!batch) throw new NotFoundException('Batch not found');
    const parcel = await this.prisma.parcel.create({
      data: {
        userBatchId: batch.id,
        trackCode: dto.trackCode ?? null,
        name: dto.name ?? null,
        cost: dto.cost ?? null,
      },
    });
    return {
      id: parcel.id,
      trackCode: parcel.trackCode,
      name: parcel.name,
      cost: parcel.cost == null ? null : Number(parcel.cost),
    };
  }

  async deleteParcel(tgUserId: number, parcelId: string) {
    const userId = await this.userId(tgUserId);
    // ownership enforced through the join to user_batch
    await this.prisma.parcel.deleteMany({
      where: { id: parcelId, userBatch: { userId } },
    });
    return { ok: true };
  }

  /** Merge each user_batch with its shared status from batch_status. */
  private async decorate(batches: UserBatchWithParcels[]) {
    if (!batches.length) return [];
    const keys = batches.map((b) => ({ carrier: b.carrier, batchNo: b.batchNo }));
    const statuses = await this.prisma.batchStatusRecord.findMany({ where: { OR: keys } });
    const byKey = new Map(statuses.map((s) => [`${s.carrier}|${s.batchNo}`, s]));

    return batches.map((b) => {
      const st = byKey.get(`${b.carrier}|${b.batchNo}`);
      return {
        id: b.id,
        carrier: b.carrier,
        batchNo: b.batchNo,
        status: (st?.status as BatchStatus | undefined) ?? null,
        statusUpdatedAt: st?.updatedAt ?? null,
        parcels: b.parcels.map((p) => ({
          id: p.id,
          trackCode: p.trackCode,
          name: p.name,
          cost: p.cost == null ? null : Number(p.cost),
        })),
      };
    });
  }
}
