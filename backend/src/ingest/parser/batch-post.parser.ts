import { Injectable } from '@nestjs/common';
import type { BatchStatus, Transport } from '../../common/status';

export interface ParsedBatch {
  batchNo: string; // canonical, e.g. "213-AVIA" or "AV-24"
  transport: Transport; // "avia" | "avto"
  status: BatchStatus | null; // null if the segment had no recognizable status
  raw: string; // the text segment this was derived from
}

// Batch tokens, two schemes in one pass:
//   1) number + word:  "213-AVIA", "208 Avto"
//   2) letter prefix (hyphenated, to avoid matching stray "at 5"): "AV-24", "AT-14"
const BATCH_TOKEN = /(\d{1,4})\s*[-–—]?\s*(avia|avto)|\b(av|at)[-–—](\d{1,4})\b/gi;

// Uzbek writes the "modifier letter" apostrophe several ways: ʻ ʼ ' ' ` and ASCII '.
const AP = "[ʻʼ'’`']";

// Checked top-to-bottom within each batch's segment; FIRST match wins.
// `arrived` sits above `transit`/`delivered`: a warehouse-arrival post usually
// also mentions same-day dostavka, but the batch itself has *arrived*.
const STATUS_RULES: { status: BatchStatus; re: RegExp }[] = [
  { status: 'airport', re: /(air[a]?portga|a[e]?roportga|aeroport|airport|samol[yoʻ']?tga|reysga\s+yuk)/i },
  { status: 'arrived', re: new RegExp(`(omborig\\w*\\s+[^\\n]*yetib\\s+kel|yetib\\s+kel(?:di|gan|ib)|yetkazib\\s+keldi|kelib\\s+bo${AP}?ldi|🥳)`, 'i') },
  { status: 'awaiting', re: /(saralash\s+kutil|kutilmoqda)/i },
  { status: 'sorting', re: /(saralanmoqda|saralanyapti|saralash\s+jarayon|saralash\s+boshlan|saralashda)/i },
  { status: 'transit', re: new RegExp(`(yo${AP}?l(?:da|ga)\\b|jo${AP}?natil|chegarad|transit|yetib\\s+kelmoqda)`, 'i') },
  { status: 'delivered', re: /(dostavka|yetkazib\s+beril|topshiril|tarqatil|qabul\s+qilib\s+ol)/i },
];

function tokenToBatch(m: RegExpExecArray): { batchNo: string; transport: Transport } {
  if (m[2]) {
    const transport = m[2].toLowerCase() as Transport; // avia | avto
    return { batchNo: `${m[1]}-${transport.toUpperCase()}`, transport };
  }
  const prefix = m[3].toUpperCase(); // AV | AT
  const transport: Transport = prefix === 'AV' ? 'avia' : 'avto';
  return { batchNo: `${prefix}-${m[4]}`, transport };
}

/**
 * Turns a carrier channel post into zero or more `{batchNo, status}` facts.
 * A single post can list many batches (the AVIA sorting schedule does), so we
 * split the text into per-batch segments and classify each independently.
 * Posts that yield a `null` status are exactly where a v2.1 LLM fallback takes over.
 */
@Injectable()
export class BatchPostParser {
  parse(text: string): ParsedBatch[] {
    if (!text) return [];

    const tokens: { index: number; batchNo: string; transport: Transport }[] = [];
    BATCH_TOKEN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BATCH_TOKEN.exec(text)) !== null) {
      tokens.push({ index: m.index, ...tokenToBatch(m) });
    }
    if (!tokens.length) return [];

    const out: ParsedBatch[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      const start = tokens[i].index;
      const end = i + 1 < tokens.length ? tokens[i + 1].index : text.length;
      const segment = text.slice(start, end);
      if (seen.has(tokens[i].batchNo)) continue; // first mention wins on duplicates
      seen.add(tokens[i].batchNo);
      out.push({
        batchNo: tokens[i].batchNo,
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
