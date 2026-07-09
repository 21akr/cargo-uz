# backend/ — NestJS API + MTProto ingest (v2)

Single NestJS app, three modules, meant to run on **one always-on host** (Oracle
free VM / Fly.io / small VPS — **not Vercel**; serverless can't hold a live
Telegram session). Boots API-only if no MTProto creds are present.

## Modules

| Module     | Job |
|------------|-----|
| `ingest`   | GramJS **MTProto** client reads carrier channels → `BatchPostParser` (regex, tested) turns each post into `{batchNo, status}` → upserts `batch_status`, emits `batch.status.changed` on change. |
| `tracking` | HTTP API for the Mini App. Guarded by `TelegramAuthGuard` (validates Mini App `initData` via HMAC with the bot token). |
| `notify`   | Listens for `batch.status.changed`, finds every user watching that `(carrier, batchNo)`, pushes a bot message. |

`ingest → notify` is decoupled through Nest's `EventEmitter`, so the parser has no
idea who's subscribed.

## Layout

```
src/
├── main.ts, app.module.ts
├── config/configuration.ts        # env → typed AppConfig (parses INGEST_CHANNELS)
├── prisma/                         # PrismaService (boots even if DB is down)
├── common/                         # status vocab, batch-no normalizer, TG auth guard/util, health
├── tracking/                       # controller + service + DTOs
├── ingest/
│   ├── parser/batch-post.parser.ts # the interesting bit
│   ├── parser/batch-post.parser.spec.ts
│   ├── ingest.service.ts           # MTProto lifecycle + upsert/emit
│   └── ingest.controller.ts        # POST /ingest/simulate (dev)
└── notify/                         # OnEvent listener + Bot API sender
prisma/schema.prisma                # BatchStatusRecord + User + UserBatch + Parcel
```

## HTTP surface

- `GET  /health`
- `POST /tracking/batches`            `{ carrier, batchNo }` — register/watch a batch
- `GET  /tracking/batches`            list my batches with merged status + parcels
- `DELETE /tracking/batches/:id`
- `POST /tracking/batches/:id/parcels` `{ trackCode?, name?, cost? }`
- `DELETE /tracking/parcels/:id`
- `POST /ingest/simulate`            `{ carrier, text }` — **dev only**: run the full
  parse→upsert→notify pipeline on a pasted channel post, no MTProto needed.

Tracking routes need `Authorization: tma <initData>` from the Mini App. For local
dev, set `DEV_TG_USER_ID` to bypass and act as a fixed user.

## Run

```bash
cp .env.example .env         # fill DATABASE_URL at minimum
npm install
npm run prisma:generate
npm run prisma:migrate       # creates tables (needs a reachable Postgres)
npm run start:dev            # http://localhost:3000
npm test                     # parser unit tests (no DB/creds needed)
```

The app boots without a DB (logs a warning; DB-backed calls then fail) and without
MTProto creds (ingest stays disabled) — so you can bring pieces up incrementally.

## Enabling MTProto ingest

1. Create an app at https://my.telegram.org → `TG_API_ID`, `TG_API_HASH`.
2. Log in **a dedicated user account** once to mint a `StringSession`; put it in
   `TG_SESSION`. **That string is full account access — keep it secret** (it's
   gitignored via `*.session` / `.env`).
3. Set `INGEST_CHANNELS=WIN=@win_channel,MEEST=@...` (carrier=channel pairs).
4. Restart — you'll see `Listening: WIN -> @win_channel` per channel.

## Deploy split

`frontend/` → Vercel (static). This backend → an always-on box. DB → Neon/Supabase
(free Postgres). Redis (only if a BullMQ queue is added later) → Upstash.

## Not built yet (later)

- LLM fallback for posts the regex parser returns `null` for (Anthropic; wire into
  `BatchPostParser` / a new `LlmParser`).
- Telegraf bot for users who prefer registering batches in-chat instead of the Mini App.
- Frontend migration: swap the tracker's `localStorage` for these endpoints.
