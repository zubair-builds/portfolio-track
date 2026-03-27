# PortfolioTrack

PortfolioTrack is a full-stack PSX (Pakistan Stock Exchange) portfolio intelligence platform built with Next.js App Router. It combines holdings management, mutual fund tracking, transaction/dividend workflows, and AI-assisted market analysis in one authenticated workspace.

## Why This Project

This repository demonstrates production-style frontend and backend engineering in a single codebase:

- Multi-page financial product with authenticated user sessions.
- API-first architecture using App Router route handlers.
- Data persistence with MongoDB and typed models/stores.
- Financial analytics and charting workflows for real use-cases.
- AI feature integration (Gemini) with server-side caching.

## Core Feature Matrix

### Portfolio Workspace

- Multi-tab dashboard (`portfolio`, `watchlist`, `analytics`, `allocation`, `mutual-funds`) with URL-synced state.
- Holdings CRUD flows with modal UX and server persistence.
- Watchlist management with thesis, target price, and notes.
- Available cash tracking and portfolio-level summary cards.
- Filtered live ticker and KSE-100 integration.

### Research & Discovery

- Symbol detail pages with company data, position context, dividend history, and sector peers.
- Companies explorer with filters/sort/pagination.
- Indices listing and index detail pages with history and constituents.
- Dividend pages with stats and per-symbol breakdown.
- Transactions pages with historical records and derived stats.

### Mutual Funds

- Dedicated mutual funds route with search and domain filters.
- Mutual-fund holdings integrated into dashboard analytics.
- NAV sync/read APIs and upload workflows for transactions.

### Analytics & Export

- Concentration risk and top-holdings analytics.
- Allocation views by stock and sector with diversification metrics.
- API-backed portfolio analytics endpoint.
- Portfolio import/export support (JSON/CSV pathways in APIs).

### AI Capabilities

- Gemini-powered insights endpoint for market/portfolio analysis.
- AI history/chat endpoints for persisted assistant interactions.
- Cached analysis responses to reduce repeated token cost.

## Technical Architecture

### Frontend

- Next.js App Router pages under `app/` with client-heavy interactive surfaces (`DashboardClient`, table modules, modal workflows).
- React state management through hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) and custom data hooks (no Redux/Zustand/React Query dependency).
- Reusable UI primitives under `components/ui` plus domain-specific components for analytics, charts, and tables.

### Backend (Route Handlers)

- API routes under `app/api/**/route.ts` grouped by domain:
  - `auth`, `portfolio`, `watchlist`, `cash`
  - `transactions`, `dividends`, `companies`, `indices`
  - `symbols`, `mutual-funds`
  - `ai` and `admin/sync`
- Most domain routes use typed MongoDB access via store/model modules in `lib/`.

### Data & Persistence

- MongoDB official driver via `lib/mongodb.ts`.
- Per-domain data access modules (examples: `userPortfolio`, `companiesStore`, `dividendsStore`, `transactionModel`, `symbolsStore`, `mutualFundModel`).
- User-scoped data model for portfolio, watchlist, transactions, and related analytics inputs.

### Integration Boundaries

- PSX REST integration through Next.js rewrite:
  - `/api/psx/:path*` -> `https://psxterminal.com/api/:path*` (`next.config.js`)
- Optional realtime market feed via `NEXT_PUBLIC_WS_URL` (WebSocket-based components).
- Gemini AI via `GEMINI_API_KEY` in server route handlers.

## Engineering Skills Demonstrated

- **Full-stack TypeScript/React**: App Router UI + backend route handlers in one repository.
- **Authentication & session security**: bcrypt password hashing, JWT signing/verification, `httpOnly` cookies, production-only secure flag.
- **API design**: structured domain routes, status handling, and route-level runtime usage.
- **Data modeling & persistence**: typed MongoDB collections, aggregation-style analytics, import/export workflows.
- **Data visualization**: `lightweight-charts` integration, portfolio analytics views, chart overlays and range tools.
- **Operational tooling**: data seeding/sync scripts, admin sync endpoints, lint/build-ready workflow.
- **External service integration**: PSX market data, Gemini AI, optional Google/Gmail OAuth flows.

## Tech Stack

- **Framework/runtime**: Next.js 15, React, TypeScript.
- **Styling/UI**: Tailwind CSS, PostCSS, reusable component primitives, `clsx`, `tailwind-merge`.
- **Data/backend**: MongoDB Node driver.
- **Auth/security**: `bcryptjs`, `jsonwebtoken`, `cookie`.
- **AI**: `@google/generative-ai` (Gemini integration).
- **Charting**: `lightweight-charts`.
- **Data ingestion/parsing**: `xlsx`, `pdf-parse`.
- **Tooling**: ESLint (Next config), `tsx` for script execution.

## Project Structure

```text
app/
  api/                         # Domain route handlers (auth, portfolio, analytics, AI, admin sync, etc.)
  DashboardClient.tsx          # Main dashboard orchestration
  page.tsx                     # Dashboard entry page
  symbol/[symbol]/page.tsx     # Symbol detail experience
  companies/page.tsx           # Companies explorer
  indices/page.tsx             # Indices overview
  transactions/page.tsx        # Transactions view
  dividends/page.tsx           # Dividends view
  mutual-funds/page.tsx        # Mutual funds explorer
components/
  tabs/                        # Dashboard tab surfaces
  ui/                          # Shared UI primitives
hooks/                         # Client data hooks
lib/                           # Data stores, models, auth, API helpers
scripts/                       # Setup/migration/utility scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MongoDB (local or Atlas)

### Install & Run

```bash
git clone <your-repo-url>
cd web-portfolioTrack
npm install
npm run dev
```

Open `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

## Environment Variables

Create a `.env` file in the project root.

```bash
# Required
MONGODB_URI=
JWT_SECRET=

# Optional (defaults to "portfolioTrack")
MONGODB_DB=

# Optional for AI features
GEMINI_API_KEY=

# Optional PSX API override (defaults to https://psxterminal.com/api)
NEXT_PUBLIC_API_BASE=

# Optional CORS allowlist for /api routes (comma-separated origins)
CORS_ALLOWED_ORIGINS=

# Optional websocket endpoint for live ticker
NEXT_PUBLIC_WS_URL=wss://psxterminal.com/

# Optional base URL / OAuth and Gmail-related flows
NEXT_PUBLIC_BASE_URL=http://localhost:3000
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_CALLBACK_URL=

# Optional admin access control
ADMIN_EMAILS=

# Optional Atlas backup script input
ATLAS_URI=
```

## Scripts

### App Lifecycle

- `npm run dev` - start local development server.
- `npm run build` - create production build.
- `npm run start` - run production server.
- `npm run lint` - run ESLint.

### Data / Operations

- `npm run sync-symbols` - initial symbol metadata sync.
- `npm run cleanup-symbols` - symbols cleanup/validation utility.
- `npm run download-atlas-db` - Atlas backup utility.
- `npm run seed-indices` - seed indices metadata.
- `npm run fetch-index-prices` - fetch current index prices.
- `npm run migrate:transactions` - migrate legacy portfolio data to transaction model.
- `npm run import-mutual-funds` - import mutual fund transactions from CSV.

For recurring sync operations, the project also exposes admin sync APIs and `/admin` UI workflows.

## API Domains (High-Level)

- `auth/*`: signup/signin/signout/check + optional Google callback flow.
- `portfolio/*` + `watchlist/*` + `cash/*`: user portfolio state operations.
- `analytics/*`: portfolio-level computed metrics.
- `transactions/*`: transaction CRUD/upload/stats/fifo preview.
- `dividends/*`: dividend records, uploads, stats, payment workflows.
- `companies/*` + `indices/*` + `symbols/*`: market datasets, filters, refresh, metadata, sector peers.
- `mutual-funds/*`: list, NAV, and mutual fund transaction management.
- `ai/*`: insights and AI chat/history persistence.
- `admin/sync/*`: long-running market-data sync control/status/progress/events.

## Deployment & Operational Notes

- The app uses a rewrite proxy for PSX data (`next.config.js`) to reduce client-side cross-origin issues.
- Middleware-level CORS handling is applied to `/api/*`; configure `CORS_ALLOWED_ORIGINS` for non-local environments.
- Auth cookies are `httpOnly`, `sameSite=lax`, and only marked `secure` in production.
- Some admin and AI endpoints use Node runtime explicitly for server capabilities.
- Keep `JWT_SECRET` and `MONGODB_URI` secure in deployment secrets.

## CI/CD Setup

- **CI (GitHub Actions):** `.github/workflows/ci.yml` runs on PRs and pushes to `main` with:
  - `npm ci`
  - `npm run lint`
  - `npm run build`
  - `npm run secret-scan`
- **CD (Vercel):** deployment is handled by Vercel Git integration after successful pushes/merges.
- Recommended branch protection:
  - require the CI workflow to pass before merging into `main`.
  - keep deployment managed only by Vercel to avoid duplicate pipelines.

## Roadmap

- Add automated tests for critical route handlers and financial calculations.
- Introduce role-based controls for admin sync routes.
- Add background job queueing for long-running ingestion tasks.
- Expand observability (structured logs, metrics, failure dashboards).
- Add CI pipeline for lint/build/test gates on pull requests.

## License

No `LICENSE` file is currently included in this repository.  
By default, this means all rights are reserved by the repository owner until a license is explicitly added.
