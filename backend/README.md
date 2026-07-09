# backend/ — v2 (not built yet)

Placeholder for the NestJS backend. Nothing here runs yet; it exists so the
monorepo shape is fixed and the frontend can later point at a real API.

## Planned shape

A **single NestJS app** running on one always-on host (Oracle free VM / Fly.io /
cheap VPS — **not Vercel**, which is serverless and can't hold a live Telegram
session). Three modules:

| Module        | Job |
|---------------|-----|
| `ingest`      | GramJS **MTProto** client. Logs in as a dedicated Telegram *user* account, reads the 5 carrier channels in real time, parses each post (regex + LLM fallback) into `{carrier, batchNo, transport, status}`. |
| `tracking`    | HTTP API the Mini App calls: register batches, add/remove parcels, read status. |
| `notify`      | On a `batch_status` change, find every user watching that `(carrier, batchNo)` and push a Telegram bot message. |

## Data model (Prisma / Postgres)

```
batch_status(carrier, batch_no, status, raw_text, updated_at)   -- PK (carrier, batch_no); written ONLY by ingest
user(id, tg_user_id)
user_batch(id, user_id, carrier, batch_no)                       -- a user watching a batch
parcel(id, user_batch_id, track_code, name, cost)                -- their trackcodes+names inside it
```

The split matters: **status is shared** across all users of a batch; the
**parcel list is private** per user. The frontend already models it this way in
`localStorage`, so migration is a straight swap of storage for API calls.

## Why MTProto and not the Bot API

The Bot API can only read chats the bot is a member/admin of — you can't add your
bot to WIN's channel. A user-account MTProto session can read any public channel.
Keep that session string in a secret manager; it's full account access.

## Free infra targets

- **App/worker:** Oracle Cloud free VM (permanent) / Fly.io / small VPS.
- **DB:** Neon or Supabase (free Postgres).
- **Redis** (only if BullMQ queue is added): Upstash free tier.
