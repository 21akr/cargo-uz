# Deploy & run

## What runs where

| Piece | Local dev | Production |
|-------|-----------|------------|
| Frontend (`frontend/index.html`) | any static server | Vercel (static) |
| Tracking API + bot + worker (one Nest app) | `npm run start:dev` on your laptop | one **always-on** box (Fly.io / Oracle / VPS) — **not Vercel** |
| Postgres | Docker or Neon | Neon / Supabase |

**Can I run the backend features locally? Yes — everything.** Details:

- **Tracking + Mini App tracker** — fully local (Postgres + a dev-auth bypass).
- **Ingest parse → status → notify** — fully local via `POST /ingest/simulate`, no Telegram account needed.
- **Push actually landing on your phone** — needs a real bot token *and* you must have pressed **Start** on the bot (bots can only DM users who started them). Without a token the app just logs "would push".
- **Live channel reading (MTProto)** — optional; needs an `api_id/hash` + session and your userbot account joined to the channels. You can skip it and use `/ingest/simulate`.

---

## Part 1 — Run everything locally

### Prereqs
Node 18+ and either Docker or a free Neon Postgres.

### 1. Start Postgres

Docker one-liner:
```bash
docker run --name cargo-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cargo \
  -p 5432:5432 -d postgres:16
```
…or create a free DB at neon.tech and copy its connection string.

### 2. Configure + migrate + start the backend
```bash
cd backend
cp .env.example .env
```
Edit `.env` — the minimum to work locally:
```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cargo?schema=public
DEV_TG_USER_ID=123456789      # bypass Telegram auth; act as this user id
CORS_ORIGINS=                 # empty = allow any origin (fine for local)
```
Then:
```bash
npm install
npm run prisma:migrate        # creates the tables
npm run start:dev             # http://localhost:3000  (GET /health -> ok)
```

### 3. Point the frontend at your backend
Serve the static file on a **different** port and open it:
```bash
npx serve frontend -l 5178    # http://localhost:5178
```
In the page's browser console, switch the tracker into API mode:
```js
localStorage.setItem('cargo_api_base', 'http://localhost:3000');
location.reload();
```
Because `DEV_TG_USER_ID` is set, the API accepts your requests without a real
Telegram `initData`. Add a batch / parcel in the **Мои посылки** tab — it now
persists in Postgres, and the status is read-only (server-owned).
To go back to offline mode: `localStorage.removeItem('cargo_api_base')`.

### 4. Exercise the ingest pipeline (no Telegram needed)
Paste a real channel post and watch it flow through parse → `batch_status` → notify:
```bash
curl -X POST http://localhost:3000/ingest/simulate \
  -H 'Content-Type: application/json' \
  -d '{"carrier":"WIN","text":"215-avia 🥳🥳🥳"}'
```
If a user is watching `WIN / 215-AVIA`, the status flips to `arrived` and a push
is attempted. Register that batch first (step 3) to see the full loop.

### 5. (optional) Real push locally
Create a bot with **@BotFather**, put its token in `TELEGRAM_BOT_TOKEN`, and press
**Start** on the bot from the account whose id you used as `DEV_TG_USER_ID`. Now
`/ingest/simulate` that changes a watched batch will DM you for real.

### 6. (optional) Live MTProto ingest locally
```bash
# get api_id/api_hash from https://my.telegram.org, then:
TG_API_ID=... TG_API_HASH=... npm run mint:session   # prints TG_SESSION=...
```
Put `TG_API_ID`, `TG_API_HASH`, `TG_SESSION` and `INGEST_CHANNELS` into `.env`,
make sure that account has **joined** the channels, and restart. You'll see
`Listening: WIN -> @win_channel` per channel; new posts update statuses live.

> Testing the Mini App *inside* Telegram locally needs a public HTTPS URL — run a
> tunnel (`cloudflared tunnel --url http://localhost:5178`) and use that URL in
> BotFather temporarily. For plain dev you don't need Telegram at all.

---

## Part 2 — Production

### Database
Neon or Supabase free tier → copy the connection string into `DATABASE_URL`.

### Backend host (always-on)
The worker holds a live Telegram connection, so it needs a process that stays up.
**Fly.io** is the least fiddly:
```bash
cd backend
fly launch --no-deploy          # creates fly.toml (internal port 3000)
fly secrets set DATABASE_URL=... TELEGRAM_BOT_TOKEN=... \
  TG_API_ID=... TG_API_HASH=... TG_SESSION=... \
  INGEST_CHANNELS='WIN=@win_channel,MEEST=@...' \
  CORS_ORIGINS='https://cargo-uz.vercel.app'
fly deploy
fly run npx prisma migrate deploy   # run migrations once against the prod DB
```
Alternatives: an **Oracle Cloud free VM** (permanently free, run it under `pm2`/systemd)
or a small VPS. Avoid Render's free web tier — it sleeps and drops the MTProto
connection.

### Mint the session (once)
```bash
TG_API_ID=... TG_API_HASH=... npm run mint:session
```
Store the output as the `TG_SESSION` secret. Never commit it.

### Bot + Mini App
1. **@BotFather** → `/newbot` → get `TELEGRAM_BOT_TOKEN`.
2. `/newapp` → pick the bot → paste your **Vercel** URL → you get a Mini App button.

### Point the deployed Mini App at the API
The frontend reads `window.CARGO_API_BASE`. Add this line in `frontend/index.html`
just before the tracker `<script>` (or inject it at deploy time):
```html
<script>window.CARGO_API_BASE = 'https://your-backend.fly.dev';</script>
```
Redeploy the frontend to Vercel. Now the Mini App runs in API mode, authenticating
each request with the user's real Telegram `initData` (no dev bypass in prod — leave
`DEV_TG_USER_ID` unset).

### CORS
Set `CORS_ORIGINS` on the backend to your exact Vercel origin(s), comma-separated.
Leaving it empty allows any origin — fine for dev, tighten it for prod.

### Before flipping ingest on
Disable or protect `POST /ingest/simulate` (it's an unauthenticated dev utility) —
gate it behind an admin token or remove the controller in production.
