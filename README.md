# cargo-uz

Tariff comparison + parcel tracking for the **China → Uzbekistan** cargo route.
Compares 5 carriers (WIN, MEEST, COMFORT, TUJJOR, CHIN), calculates a parcel's
price, and lets a user track their own shipments. Works as a normal website **and**
as a Telegram Mini App. Russian UI.

## Repo layout

```
cargo-uz/
├── frontend/        # static site / Telegram Mini App (v1, done)
│   └── index.html   # single file, no build step, no deps except Google Fonts + TG script
└── backend/         # NestJS API + MTProto worker (v2, not built yet — see backend/README.md)
```

One repo, two deploy targets: `frontend/` → Vercel (static, free); `backend/` →
an always-on host later.

## frontend/ — what's built

Vanilla HTML/CSS/JS, single file, zero build. Two tabs:

- **Калькулятор** — weight + goods type (regular/brand) + mode (air/auto). Results
  sort by total price with badges (best price, fastest, brand-no-surcharge, price-on-
  request). Weight-tiered rates, per-carrier quirks (MEEST two auto rows, COMFORT
  ≥10 kg minimum, CHIN brand TBD). All tariffs live in one `COMPANIES` array — the
  single source of truth; **to update prices, edit only that array.**
- **Мои посылки** — personal tracker. User registers a batch `(carrier, batchNo)`
  and adds their track codes + names (+ optional cost) under it. Status is set
  manually for now; persisted in `localStorage`. The data model mirrors the planned
  DB so v2 is a storage swap, not a rewrite.

Also: dark/light theme (system default, persisted), the signature dashed flight-path
header with an animated plane, `prefers-reduced-motion` respected, Telegram
`ready()`/`expand()` wired.

### Run locally

It's a static file — just open `frontend/index.html`, or serve it:

```bash
npx serve frontend
```

### Deploy

See **[DEPLOY.md](DEPLOY.md)** — running the full stack locally (Postgres +
API + tracker), and production (Vercel frontend, always-on backend, MTProto
session, BotFather Mini App). In short: frontend → Vercel (root = `frontend/`),
backend → an always-on box, DB → Neon/Supabase.

## Roadmap

- **v1 (done):** calculator + manual tracker, static, free hosting.
- **v2 (next):** NestJS backend — weight estimation from description/URL, and an
  MTProto worker that reads carrier Telegram channels and auto-updates batch status.
  See [backend/README.md](backend/README.md).

## Tariff data

Source of truth is the `COMPANIES` array in `frontend/index.html`. Prices are USD/kg,
last verified **July 2026** — carriers change them; verify against their Telegram
channels before shipping. Delivery timelines for every carrier are counted **after
goods arrive at the carrier's warehouse.**
