// Single source of truth for the status vocabulary, shared by the parser,
// notifier and DTO validation. Names MUST match the Prisma enums.

export const CARRIERS = ['WIN', 'MEEST', 'COMFORT', 'TUJJOR', 'CHIN'] as const;
export type Carrier = (typeof CARRIERS)[number];

export type Transport = 'avia' | 'avto';

export type BatchStatus =
  | 'awaiting'
  | 'sorting'
  | 'airport'
  | 'transit'
  | 'arrived'
  | 'delivered';

export const STATUS_LABEL_RU: Record<BatchStatus, string> = {
  awaiting: 'Ожидает сортировки',
  sorting: 'На сортировке',
  airport: 'Отправлен в аэропорт',
  transit: 'В пути',
  arrived: 'На складе в Узбекистане',
  delivered: 'Выдан / получен',
};

export const BATCH_STATUS_CHANGED = 'batch.status.changed';

export interface BatchStatusChangedEvent {
  carrier: string;
  batchNo: string;
  transport: Transport;
  status: BatchStatus;
  previous: BatchStatus | null;
}
