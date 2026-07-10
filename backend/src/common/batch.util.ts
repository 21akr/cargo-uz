import type { Transport } from './status';

// Two batch-code schemes seen across carriers:
//   • number + word:  "213-AVIA", "208 Avto"      (WIN, TUJJOR, …)
//   • letter prefix:  "AV-24" (avia), "AT-14" (avto)  (CHIN)
const NUM_WORD = /(\d{1,4})\s*[-–—]?\s*(avia|avto)/i;
const PREFIX_NUM = /\b(av|at)\s*[-–—]?\s*(\d{1,4})\b/i;

/**
 * Canonicalize a batch reference so a user's "av 24" and a channel's "AV-24"
 * resolve to the same key. Returns "215-AVIA" or "AV-24".
 */
export function normalizeBatchNo(input: string): string {
  const s = String(input).trim();
  let m = s.match(NUM_WORD);
  if (m) return `${m[1]}-${m[2].toUpperCase()}`;
  m = s.match(PREFIX_NUM);
  if (m) return `${m[1].toUpperCase()}-${m[2]}`;
  return s.toUpperCase();
}

export function transportOf(batchNo: string): Transport | null {
  if (/avia/i.test(batchNo) || /^av-/i.test(batchNo)) return 'avia';
  if (/avto/i.test(batchNo) || /^at-/i.test(batchNo)) return 'avto';
  return null;
}
