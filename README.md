# PortfolioTrack

Full-stack **Pakistan Stock Exchange (PSX)** portfolio app: holdings, watchlist, dividends, mutual funds, analytics, and Gemini-assisted insights.

Built with **Next.js 15 App Router**, **TypeScript**, **MongoDB**, and **Tailwind**. Auth is JWT in httpOnly cookies. Market data is proxied from PSX Terminal.

## What it does

- Dashboard tabs for portfolio, watchlist, analytics, allocation, and mutual funds (URL-synced)
- Holdings and cash CRUD, watchlist with thesis / target price
- Symbol, company, index, dividend, and transaction pages
- FIFO-aware transaction import (CSV / Excel / PDF pathways)
- Mutual-fund list, NAV sync, and holdings in portfolio analytics
- Gemini insights + chat history, cached on the server
- Admin UI to run long-running symbol/market sync jobs

This is a personal product, not a broker. It does not place orders.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 15, React 19, TypeScript |
| UI | Tailwind CSS 4, lightweight-charts |
| API | App Router route handlers under `app/api` |
| Data | MongoDB official driver (`lib/` stores and models) |
| Auth | bcrypt + JWT, httpOnly cookies |
| AI | Google Gemini (`@google/generative-ai`) |
| Market data | PSX Terminal REST rewrite + optional WebSocket ticker |
| Quality | ESLint, Husky pre-commit, GitHub Actions lint/build/secret-scan |

## Architecture (short)

```text
app/                 pages + DashboardClient
app/api/             domain routes: auth, portfolio, watchlist, cash,
                     transactions, dividends, companies, indices,
                     symbols, mutual-funds, analytics, ai, admin/sync
components/          tabs, charts, tables, UI primitives
hooks/               client data hooks (no Redux / React Query)
lib/                 Mongo stores, auth, helpers
scripts/             symbol sync, seeds, CSV import, Atlas backup
```

PSX calls go through a Next rewrite (`/api/psx/*` → `https://psxterminal.com/api/*`) so the browser does not talk to that origin directly. CORS for `/api/*` is controlled by `CORS_ALLOWED_ORIGINS`.

## Setup

Needs Node 18+, npm, and MongoDB (local or Atlas).

```bash
git clone https://github.com/zubair-builds/trackPortfolio.git
cd trackPortfolio
cp .env.example .env
# fill MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint
npm run build && npm run start
```

### Environment

Copy `.env.example`. Required:

- `MONGODB_URI`
- `JWT_SECRET`

Useful optional vars: `MONGODB_DB`, `GEMINI_API_KEY`, `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_WS_URL`, `CORS_ALLOWED_ORIGINS`, `ADMIN_EMAILS`, Google/Gmail OAuth trio if you use that sign-in path.

Do not commit `.env`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` / `lint` | App lifecycle |
| `npm run secret-scan` | Basic secret check (also in CI) |
| `npm run sync-symbols` | Initial symbol metadata |
| `npm run seed-indices` / `fetch-index-prices` | Index data |
| `npm run migrate:transactions` | Legacy holdings → transaction model |
| `npm run import-mutual-funds` | CSV import |
| `npm run download-atlas-db` | Atlas backup helper |

Recurring market sync is also driven from `/admin` and `app/api/admin/sync/*`.

A Postman collection lives at `PortfolioTrack_Postman_Collection.json`.

## CI

`.github/workflows/ci.yml` on PRs and `main`: `npm ci`, lint, build, secret-scan.

## What I would do next

- Tests for FIFO / gain-loss and the critical route handlers
- A real job queue instead of in-process admin sync
- Structured logs and basic metrics
- A license file if this stays public

## Author

[Syed Zubair Haider](https://github.com/zubair-builds) · [LinkedIn](https://www.linkedin.com/in/syed-zubair-haider/)
