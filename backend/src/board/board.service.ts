import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Rec = {
  carrier: string;
  batchNo: string;
  transport: string;
  status: string;
  updatedAt: Date;
} | null;

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  private slim(r: Rec) {
    return r
      ? {
          carrier: r.carrier,
          batchNo: r.batchNo,
          transport: r.transport,
          status: r.status,
          updatedAt: r.updatedAt,
        }
      : null;
  }

  /** Latest arrivals per transport + a feed of recently-updated batches. */
  async latest(limit = 15) {
    const take = Math.min(Math.max(limit, 1), 50);
    const arrivedWhere = (transport: 'avia' | 'avto') => ({
      transport,
      status: { in: ['arrived', 'delivered'] as ('arrived' | 'delivered')[] },
    });

    const [recent, avia, avto] = await Promise.all([
      this.prisma.batchStatusRecord.findMany({ orderBy: { updatedAt: 'desc' }, take }),
      this.prisma.batchStatusRecord.findFirst({
        where: arrivedWhere('avia'),
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.batchStatusRecord.findFirst({
        where: arrivedWhere('avto'),
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      arrivals: { avia: this.slim(avia), avto: this.slim(avto) },
      recent: recent.map((r) => this.slim(r)),
    };
  }
}
