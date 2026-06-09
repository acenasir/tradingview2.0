# OpenChart

A free, self-hosted, single-page **multi-chart trading dashboard** — a
TradingView-style charting workspace you run locally. Up to **16 independent
charts** on one screen, **delayed-first** market data that works on free API
tiers, and (coming in a later step) **Alpaca paper trading** with fake money.

> **Charting by [TradingView Lightweight Charts™](https://www.tradingview.com/)** (Apache-2.0). See [`ATTRIBUTION.md`](./ATTRIBUTION.md).

---

## Status

This repo currently implements **build steps 1–4** of the plan:

1. ✅ Vite + React + TS + Tailwind scaffold, dark theme, four-region shell, status bar
2. ✅ `ChartPane` rendering candlestick / bar / line / area / baseline / Heikin-Ashi
3. ✅ `ChartGrid` + layout picker (1, 2-split ×2, 3, 4, 6, 8, 9, **16**), active-pane
   selection, per-pane config, localStorage persistence, shared `ResizeObserver`
4. ✅ Data layer + **delayed-free** mode (default): provider abstraction, Twelve Data
   provider, shared poller with caching + rate-limit guard, `/api` proxy, freshness badges
7. ✅ **Paper trading (Alpaca)**: account strip, positions, order ticket
   (market/limit/stop/stop-limit/trailing + bracket + fractional/notional + short),
   open orders with cancel, status-bar equity — all REST through a **paper-host-only**
   `/api/alpaca` proxy with a live-host guard.
10. ✅ Drawing tools (brought forward): **trend line, horizontal line, Fibonacci
    retracement** — drawn on the chart via Lightweight Charts series primitives
    (anchored in logical/price space so they hold position on pan/zoom), persisted
    per pane + symbol + timeframe. Ray / rectangle / text are stubbed.

Still to come: realtime streaming (Finnhub/Alpaca IEX), indicators, news, the
remaining drawing tools, and Vercel deployment hardening.

### Graceful by design

The app is **always usable, even with no keys and no network**. If a provider
key is missing or unreachable, OpenChart falls back to deterministic **demo**
data (badged `demo`) so every pane is populated. Add a Twelve Data key and run
via `vercel dev` to get real delayed data.

---

## Quick start

### Option A — UI only (demo data, fastest)

```bash
npm install
npm run dev          # http://localhost:5173
```

`/api/*` proxy functions don't run under plain Vite, so data shows as `demo`.
This is perfect for trying the layout, the 16-grid, watchlists, and chart types.

### Option B — real delayed data (via Vercel CLI)

`/api` functions inject your provider keys server-side, so secrets never reach
the browser. Run the Vite app **and** the `/api` functions together with
`vercel dev`:

```bash
npm install
npm i -g vercel
cp .env.example .env          # fill in TWELVEDATA_KEY (one key is enough)
vercel dev                    # serves the app + /api at http://localhost:3000
```

Visit `http://localhost:3000`, flip a pane to a real symbol (e.g. `AAPL`), and
panes/watchlist rows show `delayed` instead of `demo`.
Check `GET /api/health` to confirm which keys the server can see.

---

## Free API keys

The app works with **just one** data key in the default delayed mode. Twelve
Data is recommended (global coverage + symbol search).

| Provider | Used for | Free tier | Get a key |
|---|---|---|---|
| **Twelve Data** | History, search, delayed quotes (global) | ~8 req/min, ~800/day | https://twelvedata.com/ |
| **Finnhub** | US realtime WS, company news *(later step)* | 60 req/min | https://finnhub.io/ |
| **Alpha Vantage** | Last-resort delayed fallback *(optional)* | 25 req/day | https://www.alphavantage.co/support/#api-key |
| **Alpaca** | Paper trading + IEX data *(later step)* | $100k virtual | https://alpaca.markets/ → Paper Trading → API Keys |

Put them in `.env` (see [`.env.example`](./.env.example)). For production, set
them in the Vercel dashboard. Only `VITE_`-prefixed, **non-secret** values ever
reach the browser bundle. Rate limits are noted inline at each call site.

---

## Paper trading (Alpaca)

OpenChart trades **only against Alpaca's paper endpoint** (`paper-api.alpaca.markets`)
— fake money, real order simulation. The proxy host is hardcoded and the app
**refuses the live-money host**, so there is no way to route a real order.

1. Create a free Alpaca account → **Paper Trading** → generate API keys.
2. Put them in `.env` (and your Vercel env): `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY`.
3. Run via `vercel dev` (the secret key must stay server-side). Open the **Trade**
   tab (or press `b` / `s`). The panel shows a **PAPER — simulated funds** banner,
   account equity / buying power / cash / day P&L, an order ticket
   (market · limit · stop · stop-limit · trailing-stop, with bracket TP/SL,
   fractional/notional, and short selling), open orders (cancel / cancel-all), and
   live positions (with one-click close).

Order/position/account updates are fetched by REST polling (every ~6s), which works
identically locally and on Vercel — no persistent WebSocket required. If the keys
aren't set, the Trade tab shows setup instructions and the status bar reads `Paper: off`.

**Reset the paper account:** there's no API for it — use the Alpaca dashboard
(Paper Trading → account menu → **Reset**) to restore the $100k virtual balance.

## Delayed vs. realtime

- **`delayed-free` (default):** polls free delayed REST endpoints on a shared
  interval (15s by default, configurable in Settings). Aggressively cached and
  rate-limited to respect free daily/minute caps. 100% serverless-compatible.
- **`realtime` (opt-in, later step):** streams where available (Finnhub WS for
  US, Alpaca IEX). Symbols without a free realtime source degrade gracefully to
  delayed polling and are badged accordingly.

Each pane and watchlist row shows a **freshness badge**: `delayed`, `live · IEX`,
`live`, `EOD`, or `demo`.

> **Data licensing caveat:** real-time global tick data is not free. Non-US
> symbols are delayed on free tiers, and even "real-time" free US data is
> **IEX-only** (a single exchange), not full-market SIP. To add full SIP later,
> bring a paid Polygon/Alpaca-SIP key and add a provider in `src/data/providers/`.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `1`–`8` | Switch layout preset (1, 2┃, 2━, 3, 4, 6, 8, 9) |
| `g` | 16-chart grid (4×4) |
| `/` | Focus global symbol search |
| `b` / `s` | Open the buy / sell ticket for the active pane's symbol |

Each chart **starts empty** — assign a symbol per pane via the in-pane search
(or its quick-picks), the pane header's symbol button, the global top-bar search,
or by clicking a watchlist row. Click a pane to make it **active** — the top
toolbar (symbol, timeframe, chart type) targets the active pane. Double-click a
pane header to maximize/restore.

**Drawing:** pick a tool from the left toolbar — **trend line** / **Fib** (click two
points) or **horizontal line** (click once). `Esc` cancels an in-progress drawing;
the eraser clears the active pane's drawings. Drawings are saved per
pane + symbol + timeframe.

---

## Project structure

```
api/                 Vercel serverless proxy (keys stay server-side)
  _lib/proxy.ts      shared CORS / passcode / fetch helpers (not a route)
  td/[...path].ts    Twelve Data proxy
  health.ts          which keys are configured
src/
  store/             zustand: layout, watchlists, settings (persisted)
  data/
    providers/       types, twelvedata, mock, router, universe
    cache.ts         TTL + localStorage caches
    quotes.ts        shared ref-counted poller + React hooks
  components/        ChartGrid, ChartPane, TopToolbar, SymbolSearch,
                     LayoutPicker, DataModeToggle, LeftToolbar, StatusBar,
                     RightSidebar/ (Watchlist, Details, …)
  indicators/        (later step) pure, tested indicator functions
  lib/               formatting, resolutions, candles/Heikin-Ashi, resize, layouts
```

---

## Deployment (Vercel) — preview

`delayed-free` mode is fully serverless-compatible.

```bash
vercel link
vercel env pull       # for local vercel dev
vercel                # preview deploy
vercel --prod         # production
```

`vercel.json` sets the Vite framework preset and an SPA fallback (all non-`/api`
routes → `index.html`).

**Access guard (before `--prod`):** the deployed app has no login. Set
`APP_PASSCODE` in Vercel env — the `/api` functions then require an
`x-app-passcode` header so random visitors can't burn your quotas. (Alternatively
enable Vercel's built-in password protection.)

---

## Scripts

```bash
npm run dev         # Vite dev server (demo data)
npm run build       # typecheck + production build → dist/
npm run typecheck   # tsc, both app and node/api projects
npm run test        # vitest (indicator unit tests, later step)
```
