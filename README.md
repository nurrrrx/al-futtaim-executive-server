# Al-Futtaim Executive BI — Server

Backend API for the [Al-Futtaim Executive BI](https://github.com/nurrrrx/al-futtaim-executive-bi) iPad dashboard. Express + Node 20, MongoDB-backed for user customizations (designs/layouts), with **deterministic seeded analytics** for everything else — no real database needed for KPIs.

**Production:** [`al-futtaim-executive-server-production.up.railway.app`](https://al-futtaim-executive-server-production.up.railway.app) · **Swagger UI:** [`/docs`](https://al-futtaim-executive-server-production.up.railway.app/docs)

---

## Quick start

```bash
# 1. Install
npm install

# 2. (optional) Set MongoDB URI for designs/layouts persistence
export MONGO_URL="mongodb://localhost:27017/alfuttaim"

# 3. Run dev server (hot-reload via node --watch)
npm run dev          # → http://localhost:3001

# Production mode
npm start
```

Without MongoDB, analytics endpoints still work (they use deterministic seeded data). Only `/api/designs/*` and `/api/layouts/*` need the DB — without it, they'll respond with empty lists and POST/PUT will silently no-op.

| Command | Purpose |
|---|---|
| `npm run dev` | Hot-reload via `node --watch index.js` |
| `npm start` | Production mode |

Visit [`http://localhost:3001/api`](http://localhost:3001/api) for the endpoint index, or [`http://localhost:3001/docs`](http://localhost:3001/docs) for Swagger UI.

---

## Architecture

```
┌─────────────────────────┐
│  iPad app (Expo)        │  ← EXPO_PUBLIC_API_BASE points here
└────────────┬────────────┘
             │ HTTPS
             ▼
┌─────────────────────────┐
│  Express server         │
│  ┌───────────────────┐  │
│  │ Analytics routes  │──┼──► seedEngine.js (deterministic RNG)
│  │ (6 modules)       │  │    → no DB needed; same seed → same values
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Designs / Layouts │──┼──► MongoDB (mongoose)
│  │ (CRUD)            │  │    → user customizations persisted
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Logistics yard    │──┼──► JSON file (kizad_full_data.json)
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Swagger UI        │──┼──► /docs (custom-themed)
│  └───────────────────┘  │
└─────────────────────────┘
```

### Why seeded analytics instead of a real DB

The dashboard surfaces KPIs across many countries, brands, and time periods. Rather than maintain real datasets, [`data/seedEngine.js`](./data/seedEngine.js) hashes the input (e.g. country + month) and uses a Lehmer LCG to generate stable pseudo-random values. **Same input → same output, every time.** This makes the API:

- Deterministic (deploys + repeated requests return identical data)
- Statelessly scalable (no DB hits for KPI queries)
- Easy to tweak (vary base values via `seed.vary(base, 0.15)`)

Replace any module's data file (e.g. [`data/salesInsights.js`](./data/salesInsights.js)) with a real-DB query when production data lands.

### What MongoDB *is* used for

- **Designs** ([`models/Design.js`](./models/Design.js)) — saved visual style overrides users create in Designer mode
- **Layouts** ([`models/Layout.js`](./models/Layout.js)) — saved card position/size sets users create in Layout mode

These are the only stateful resources. Without MongoDB, the server logs `Server will continue without MongoDB — designs will not persist` and keeps serving analytics.

---

## API endpoints

All endpoints accept `?month=YYYY-MM` and `?period=MTD|YTD`. Most accept additional filters (`country`, `brand`, `model`, `showroom`).

### Analytics (6 modules)

| Endpoint | Returns |
|---|---|
| `GET /api/market-intelligence/overview` | Country cards with market size & share |
| `GET /api/market-intelligence/detail?country=` | Brand market share for a country |
| `GET /api/market-intelligence/competition` | Top 10 brands, winners, losers |
| `GET /api/market-intelligence/geo` | Geographic config (coordinates, cameras) |
| `GET /api/sales-insights/overview` | Sales KPIs, country & brand breakdown |
| `GET /api/sales-insights/daily` | Daily sales with cumulative totals |
| `GET /api/sales-insights/model-channel` | Sales by model and channel |
| `GET /api/sales-insights/showroom` | Showroom performance ranking |
| `GET /api/sales-insights/geo` | Per-country geo overlay config |
| `GET /api/lead-management/overview` | Lead funnel, conversion rates, lost reasons |
| `GET /api/lead-management/brands` | Lead metrics by brand and region |
| `GET /api/customer-intelligence/overview` | Customer KPIs & demographics |
| `GET /api/customer-intelligence/sentiment` | Sentiment analysis by topic |
| `GET /api/customer-intelligence/brand-comparison` | Brand-vs-brand comparison metrics |
| `GET /api/financial-intelligence/overview` | Financial KPIs & monthly forecast |
| `GET /api/financial-intelligence/profitability` | Brand profitability |
| `GET /api/financial-intelligence/indirect-costs` | Indirect cost categories |
| `GET /api/financial-intelligence/fcf` | Free cash flow components |
| `GET /api/stock-logistics/overview` | Stock KPIs, brand stock, run-down |
| `GET /api/stock-logistics/logistics` | Supply pipeline & brand logistics |

> **Note on lead-management:** the iPad app also calls `/api/leads/funnel` and `/api/leads/geo`; verify those are wired in [`routes/leadManagement.js`](./routes/leadManagement.js).

### User customization (MongoDB)

| Endpoint | Body | Purpose |
|---|---|---|
| `GET /api/designs` | — | List all saved designs |
| `GET /api/designs/:file` | — | Get one design |
| `POST /api/designs` | `{ name, designerName?, description?, overrides, baseSnapshot? }` | Create or upsert a design |
| `PUT /api/designs/:file` | `{ overrides?, comment?, name?, designerName?, description? }` | Update a design |
| `DELETE /api/designs/:file` | — | Delete a design |
| `GET /api/layouts` | — | List all saved layouts |
| `GET /api/layouts/:file` | — | Get one layout |
| `POST /api/layouts` | `{ name, designerName?, description?, positions, basePositions? }` | Create or upsert a layout |
| `PUT /api/layouts/:file` | `{ positions?, comment?, name?, designerName?, description? }` | Update a layout |
| `DELETE /api/layouts/:file` | — | Delete a layout |

A "Default" design is auto-seeded on startup if none exists.

### Special / utility

| Endpoint | Purpose |
|---|---|
| `GET /api/logistics/grid/full` | Full Kizad yard data including per-spot car occupancy (served from JSON file) |
| `GET /api` | Endpoint index (machine-readable) |
| `GET /docs` | **Swagger UI** (custom-themed to match the BI app aesthetic) |
| `GET /openapi.json` | OpenAPI 3.0 spec |
| `GET /health`, `GET /api/health` | Health check |

---

## Project structure

```
.
├── index.js                       # Entry: Express setup, mounts routes, MongoDB connect, Swagger
├── db.js                          # MongoDB connection (graceful fallback if unreachable)
├── openapi.js                     # OpenAPI 3.0 spec (served at /openapi.json)
├── swagger.json                   # Pre-built spec backup
├── package.json
│
├── routes/                        # Express routers — one file per module
│   ├── marketIntelligence.js
│   ├── salesInsights.js
│   ├── leadManagement.js
│   ├── customerIntelligence.js
│   ├── financialIntelligence.js
│   ├── stockLogistics.js
│   └── docs.js
│
├── data/                          # Per-module data generators (seeded RNG)
│   ├── seedEngine.js              # Deterministic Lehmer LCG random
│   ├── brandsModels.js            # Brand & model master list
│   ├── salesInsights.js
│   ├── marketIntelligence.js
│   ├── leadManagement.js
│   ├── customerIntelligence.js
│   ├── financialIntelligence.js
│   ├── stockLogistics.js
│   └── (v2)/logistics/            # Static JSON for yard grid
│
├── models/                        # Mongoose schemas
│   ├── Design.js                  # User-saved visual style overrides
│   └── Layout.js                  # User-saved card positions/sizes
│
├── services/                      # Business logic helpers
│   ├── designs.js
│   ├── designs-data/              # Design seeds
│   ├── logistics.js
│   └── logistics-data/
│       └── kizad_full_data.json   # Yard data with per-cell occupancy
│
├── designs/                       # (storage dir for design exports if any)
└── seedDefaultDesign.js           # Standalone script to seed the Default design
```

---

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP listen port |
| `MONGO_URL` / `MONGO_URI` / `MONGODB_URL` | `mongodb://localhost:27017/alfuttaim` | MongoDB connection string. The first set var wins. |

If MongoDB is unreachable, the server logs the error and continues serving analytics. Designs/layouts endpoints will return empty results until the DB is back.

---

## Adding a new endpoint

### A new endpoint in an existing module

1. Open the relevant `routes/<module>.js`.
2. Add a new `router.get('/your-path', (req, res) => { ... })`.
3. If it returns generated data, add a `getYourThing(month, period, filters)` function in `data/<module>.js` using the seeded RNG.
4. Update [`openapi.js`](./openapi.js) so it shows in Swagger.
5. Update the endpoint index in [`index.js`](./index.js) (the `/api` route).

### A new module

1. Create `routes/<newModule>.js` (use an existing one as template).
2. Create `data/<newModule>.js` with seeded data generators.
3. Mount it in [`index.js`](./index.js): `app.use('/api/<new-module>', require('./routes/<newModule>'));`
4. Add it to the OpenAPI spec and the `/api` index.
5. Update the iPad app's [`services/api.ts`](https://github.com/nurrrrx/al-futtaim-executive-bi/blob/main/services/api.ts) to consume it.

### Replacing seeded data with a real source

The seeded data is meant as a stand-in. To wire a real source for a module:

1. In `data/<module>.js`, replace the seeded calls inside `getOverview()` (and friends) with real DB / external API calls.
2. Keep the same return shape — the iPad app's components depend on it.
3. Make sure caching / latency is acceptable; consider adding a Redis layer if needed.

---

## Deployment (Railway)

The production server runs on Railway. The `start` script (`node index.js`) is the entrypoint. Required env vars on Railway:

- `PORT` — auto-set by Railway
- `MONGO_URL` — Railway MongoDB plugin connection string

Deploys trigger automatically when `main` is pushed (assuming GitHub integration is enabled in Railway).

To redeploy manually: push a no-op commit, or use the Railway dashboard to trigger a redeploy from the latest commit.

---

## Versioning

`package.json` version stays in sync with the [iPad app's](https://github.com/nurrrrx/al-futtaim-executive-bi) `app.json` and `version.json` for clarity. Bump together when shipping a coordinated change. The current pattern:

```bash
# in this repo:
npm version 1.4.0 --no-git-tag-version
git commit -am "v1.4: bump to 1.4.0"
git push origin main
```

Railway deploys the new version automatically.

---

## Tech stack

| Library | Use |
|---|---|
| **express** | HTTP framework |
| **mongoose** | MongoDB ODM (designs + layouts only) |
| **cors** | Allow the iPad app to call cross-origin |
| **swagger-ui-express** | Interactive API docs at `/docs` (custom-themed) |

Node 20+ recommended (uses `node --watch` for dev mode).

---

## Resources

- **iPad client:** [github.com/nurrrrx/al-futtaim-executive-bi](https://github.com/nurrrrx/al-futtaim-executive-bi)
- **Swagger UI (prod):** [`al-futtaim-executive-server-production.up.railway.app/docs`](https://al-futtaim-executive-server-production.up.railway.app/docs)
- **Endpoint index (prod):** [`/api`](https://al-futtaim-executive-server-production.up.railway.app/api)
- **Health (prod):** [`/health`](https://al-futtaim-executive-server-production.up.railway.app/health)
