import { BatchPostParser } from './batch-post.parser';

describe('BatchPostParser', () => {
  const parser = new BatchPostParser();

  it('parses a multi-batch AVIA sorting schedule', () => {
    const text = `📆 AVIA yuklar saralash jadvali (yangi)

✔️  213-AVIA
Saralash kuni: 26-29-iyun
Holati: 2-iyul kuni yetib kelgan ✅

✔️214-AVIA
Saralash kuni: 29-3-iyun
Holati: Airaportga yuborilmoqda.

🌸215-AVIA
Saralash kuni: 3-6-iyul
Holati: Saralash kutilmoqda.

🌸216-AVIA
Saralash kuni: 6-10-iyul
Holati: Saralash kutilmoqda.

🌸217-AVIA
Saralash kuni: 10–13-iyul
Holati: Saralash kutilmoqda.

Reyslar saralash vaqtlari yuk chiqish kuni saot 12:00 (tushlik vaqti) ga qadar kelgan yuklar ham kiritilmoqda.`;

    const res = parser.parse(text);
    expect(res.map((r) => r.batchNo)).toEqual([
      '213-AVIA',
      '214-AVIA',
      '215-AVIA',
      '216-AVIA',
      '217-AVIA',
    ]);
    expect(res.map((r) => r.status)).toEqual([
      'arrived',
      'airport',
      'awaiting',
      'awaiting',
      'awaiting',
    ]);
    expect(res.every((r) => r.transport === 'avia')).toBe(true);
  });

  it('parses a bare celebration post as arrived', () => {
    const res = parser.parse('213-avia 🥳🥳🥳');
    expect(res).toEqual([
      expect.objectContaining({ batchNo: '213-AVIA', transport: 'avia', status: 'arrived' }),
    ]);
  });

  it('parses an AVTO warehouse-arrival post as arrived (not delivered)', () => {
    const text = `📦 Hurmatli mijozlar!
🚛 208-Avto yuklarimiz kecha Oʻzbekiston omboriga muvaffaqiyatli yetib keldi.
✅ Barcha mijozlarimizga yuk hisoboti yuborib bo'lindi.
🚚 Toshkent shahri bo'ylab yetkazib berish (dostavka) bugun amalga oshiriladi.
📮 Viloyatlarga yuboriladigan yuklar esa ertaga pochta orqali jo'natiladi.`;

    const res = parser.parse(text);
    expect(res).toHaveLength(1);
    expect(res[0]).toEqual(
      expect.objectContaining({ batchNo: '208-AVTO', transport: 'avto', status: 'arrived' }),
    );
  });

  it('classifies transit and delivered when unambiguous', () => {
    expect(parser.parse("211-avia yoʻlga chiqdi").at(0)?.status).toBe('transit');
    expect(parser.parse('210-avto mijozlarga topshirildi').at(0)?.status).toBe('delivered');
  });

  it('returns [] when there is no batch token', () => {
    expect(parser.parse('Ofisimiz bugun ochiq, xayrli kun tilaymiz!')).toEqual([]);
  });

  it('does not treat a date range as a batch token', () => {
    const res = parser.parse('Saralash kuni: 26-29-iyun. 213-AVIA yetib keldi.');
    expect(res).toHaveLength(1);
    expect(res[0].batchNo).toBe('213-AVIA');
    expect(res[0].status).toBe('arrived');
  });
});
