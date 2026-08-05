# cargo-uz

Tariff comparison + parcel tracking for the **China → Uzbekistan** cargo route.
Compares 5 carriers (WIN, MEEST, COMFORT, TUJJOR, CHIN), calculates a parcel's
price, and lets a user track their own shipments. Works as a normal website **and**
as a Telegram Mini App. Russian UI.

## Repo layout

```
cargo-uz/
├── frontend/          # static site / Telegram Mini App — no build step, no bundler
│   ├── carriers.js    # ⭐ ALL carrier facts live here and nowhere else
│   ├── utils.js       # shared helpers (esc, fmt, tiers, FLIP, Telegram bits)
│   └── index.html     # markup + app logic, renders everything from carriers.js
└── backend/           # NestJS API + MTProto ingest worker — see backend/README.md
```

One repo, two deploy targets: `frontend/` → Vercel (static, free); `backend/` →
an always-on host.

## Updating tariffs

**Edit `frontend/carriers.js`. That's the whole job.** The calculator, the tariff
table, the notes, the carrier sheet and the tracker dropdown are all rendered from
it, so they can't drift apart. There are no prices anywhere else in the codebase.

Conventions that matter:

- `regular: [{to:10, rate:9.5}, {to:null, rate:8.5}]` — tiers ascending, `to:null`
  means "and everything above".
- `brand: 'same'` (no surcharge, confirmed) · `[tiers]` (own scale) · `null`
  (**unknown** — the UI shows «уточняется» and refuses to quote a price).
- `unknowns: [...]` — surfaced in the app as «что уточняется». Prefer listing a gap
  over guessing; the app is honest about what it doesn't know.
- Each carrier has its own `updated` date, so stale entries are visible.

A startup check console-warns if a carrier is missing a required field.

## frontend/ — what's built

Vanilla HTML/CSS/JS, zero build. Three tabs:

- **Калькулятор** — weight + goods type (regular/brand) + mode (air/auto). Results
  sort by total price with badges (best price, fastest, brand-no-surcharge, price-on-
  request) and animate into their new order (FLIP). Above them, a wireframe SVG globe
  with a CN→UZ arc whose caption tracks the live calculation. **Tap any result** (or
  any row in the tariff table) to open the carrier sheet: editorial scorecard, tier
  tables, delivery, pros/cons, «что уточняется», and tap-to-call contacts.
- **Мои посылки** — personal tracker. User registers a batch `(carrier, batchNo)`
  and adds track codes + names + cost under it. Runs on `localStorage` offline, or
  against the backend API when `CARGO_API_BASE` is set (then status is server-owned).
- **Рейсы** — public feed of the latest avia/avto arrivals and recent batch status
  changes. Needs the backend.

Also: dark/light theme following Telegram's own scheme (persisted), haptics, the
signature dashed flight-path header, and `prefers-reduced-motion` respected
throughout.

### Run locally

Serve the folder (opening the file directly via `file://` won't load the two
scripts on some browsers):

```bash
npx serve frontend
```

### Deploy

See **[DEPLOY.md](DEPLOY.md)** — running the full stack locally (Postgres +
API + tracker), and production (Vercel frontend, always-on backend, MTProto
session, BotFather Mini App). In short: frontend → Vercel (root = `frontend/`),
backend → an always-on box, DB → Neon/Supabase.

## Roadmap

- **v1 (done):** calculator, carrier sheets, manual tracker — static, free hosting.
- **v2 (scaffolded):** NestJS backend — tracking API, flights board, and an MTProto
  worker that reads carrier Telegram channels and auto-updates batch status.
  See [backend/README.md](backend/README.md).
- **later:** weight estimation from a product description or URL; an admin UI for
  editing tariffs instead of hand-editing `carriers.js`.

## Tariff data

Source of truth is `frontend/carriers.js`. Prices are USD/kg with per-carrier
`updated` dates — carriers change them; verify against their Telegram
channels before shipping. Delivery timelines for every carrier are counted **after
goods arrive at the carrier's warehouse.**
