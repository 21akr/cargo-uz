import type { Transport } from './status';

const BATCH_TOKEN = /(\d{1,4})\s*[-–—]?\s*(avia|avto)/i;

/**
 * Canonicalize a batch reference so a user's "215-avia" and a channel's
 * "215 AVIA" resolve to the same key. Returns e.g. "215-AVIA".
 */
export function normalizeBatchNo(input: string): string {
  const m = String(input).match(BATCH_TOKEN);
  if (m) return `${m[1]}-${m[2].toUpperCase()}`;
  return String(input).trim().toUpperCase();
}

export function transportOf(batchNo: string): Transport | null {
  const m = String(batchNo).match(/(avia|avto)/i);
  return m ? (m[1].toLowerCase() as Transport) : null;
}
