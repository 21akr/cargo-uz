import { Injectable } from '@nestjs/common';
import { normalizeBatchNo } from '../../common/batch.util';
import type { BatchStatus, Transport } from '../../common/status';

export interface ParsedBatch {
  batchNo: string; // canonical, e.g. "213-AVIA"
  number: string; // "213"
  transport: Transport; // "avia" | "avto"
  status: BatchStatus | null; // null if the segment had no recognizable status
  raw: string; // the text segment this was derived from
}

// A batch reference like "213-AVIA", "208 Avto", "215-avia".
const BATCH_TOKEN = /(\d{1,4})\s*[-–—]?\s*(avia|avto)/gi;

// Checked top-to-bottom within each batch's text segment; FIRST match wins.
// Order is deliberate: `arrived` sits above `transit`/`delivered` because a
// warehouse-arrival post usually also mentions same-day dostavka and regional
// post — the batch itself has just *arrived*, so that must win.
const STATUS_RULES: { status: BatchStatus; re: RegExp }[] = [
  { status: 'airport', re: /(air[a]?portga|a[e]?roportga|aeroport|airport|samol[yoʻ']?tga|reysga\s+yuk)/i },
  { status: 'arrived', re: /(omborig\w*\s+[^\n]*yetib\s+kel|yetib\s+kel(?:di|gan|ib)|yetkazib\s+keldi|kelib\s+bo[ʻ'`]?ldi|🥳)/i },
  { status: 'awaiting', re: /(saralash\s+kutil|kutilmoqda)/i },
  { status: 'sorting', re: /(saralanmoqda|saralanyapti|saralash\s+jarayon|saralash\s+boshlan|saralashda)/i },
  { status: 'transit', re: /(yo[ʻ'`]?l(?:da|ga)\b|jo[ʻ'`]?natil|chegarad|transit|yetib\s+kelmoqda)/i },
  { status: 'delivered', re: /(dostavka|yetkazib\s+beril|topshiril|tarqatil|qabul\s+qilib\s+ol)/i },
];

/**
 * Turns a carrier channel post into zero or more `{batchNo, status}` facts.
 * A single post can list many batches (the AVIA sorting schedule does), so we
 * split the text into per-batch segments and classify each independently.
 *
 * This is the deterministic layer. Posts that yield a `null` status are exactly
 * where the v2.1 LLM fallback would take over.
 */
@Injectable()
export class BatchPostParser {
  parse(text: string): ParsedBatch[] {
    if (!text) return [];

    const tokens: { index: number; number: string; transport: Transport }[] = [];
    BATCH_TOKEN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BATCH_TOKEN.exec(text)) !== null) {
      tokens.push({ index: m.index, number: m[1], transport: m[2].toLowerCase() as Transport });
    }
    if (!tokens.length) return [];

    const out: ParsedBatch[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      const start = tokens[i].index;
      const end = i + 1 < tokens.length ? tokens[i + 1].index : text.length;
      const segment = text.slice(start, end);
      const batchNo = normalizeBatchNo(`${tokens[i].number}-${tokens[i].transport}`);
      if (seen.has(batchNo)) continue; // first mention wins on duplicates
      seen.add(batchNo);
      out.push({
        batchNo,
        number: tokens[i].number,
        transport: tokens[i].transport,
        status: this.classify(segment),
        raw: segment.trim(),
      });
    }
    return out;
  }

  private classify(segment: string): BatchStatus | null {
    for (const rule of STATUS_RULES) {
      if (rule.re.test(segment)) return rule.status;
    }
    return null;
  }
}
