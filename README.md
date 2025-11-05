# PortfolioTrack

PortfolioTrack is a Next.js App Router dashboard that helps you monitor a Pakistan Stock Exchange (PSX) equity portfolio. It blends a curated baseline of holdings with live quotes pulled from PSX Terminal, giving you allocation insights, gain/loss analytics, and watchlist context in a single view.

## Feature Highlights
- **User Authentication** - Secure sign up/sign in with MongoDB-backed accounts and JWT cookies
- **Personalized Portfolios** - Each user has their own portfolio and watchlist stored in MongoDB
- **Portfolio Management** - Add, edit, and delete holdings with modal interfaces
- **Portfolio overview cards** summarise invested capital, current value, absolute performance, and top movers
- **Allocation analytics** combine a donut chart and stacked bar to visualise diversification across positions
- **Holdings table** with search, sorting, edit/delete actions, and detailed stock modals
- **Watchlist management** - Track symbols with investment thesis, target prices, and notes
- **AI-Powered Insights** - Gemini AI integration for stock analysis and market trends with MongoDB caching
- **Symbol Data Extraction** - Fetch structured PSX data and save to database for enhanced analytics
- **Export/Import** - Download portfolio as JSON or CSV, import from JSON files
- **Analytics API** - User-specific portfolio metrics and concentration risk analysis
- **Responsive, dark-mode friendly UI** powered by reusable primitives under `components/ui`

## Architecture at a Glance
- `lib/portfolioData.ts` seeds holdings, watchlist metadata, and exposes `calculatePortfolioStats` for the dashboard cards.
- `hooks/usePortfolioData.ts` orchestrates quote loading, memoises derived state, and tracks last-updated timestamps.
- `lib/stockApi.ts` fetches data from PSX Terminal via the rewrite defined in `next.config.js`, caches responses in `localStorage`, and provides helpers to inspect or clear that cache.
- `lib/symbolsStore.ts` persists symbol price data to MongoDB and exposes helpers for price management and refresh.
- `app/page.tsx` composes the client-side dashboard, handles modal state, and formats timestamps for badges.

## Directory Layout
```
portfolioTrack/
├─ app/
│  ├─ api/                 # Next.js App Router API routes and rewrites
│  ├─ globals.css          # Tailwind layer + design tokens
│  ├─ layout.tsx           # Root document, font setup
│  └─ page.tsx             # Portfolio dashboard (client component)
├─ components/
│  ├─ CacheManager.tsx
│  ├─ PortfolioAllocation.tsx
│  ├─ PortfolioSummary.tsx
│  ├─ PortfolioTable.tsx
│  ├─ StockDetailsModal.tsx
│  ├─ Watchlist.tsx
│  └─ ui/                  # Shared Card/Badge/Button/Skeleton primitives
├─ hooks/usePortfolioData.ts
├─ lib/
│  ├─ portfolioData.ts
│  └─ stockApi.ts
└─ next.config.js          # PSX proxy rewrite
```

## Getting Started

### Prerequisites
- Node.js 18 or newer
- npm, pnpm, or yarn

### Installation
1. Clone the repository.
```
git clone git@github.com:your-user/portfolioTrack.git
cd portfolioTrack
```
2. Install dependencies.
```
npm install
```
3. Configure environment variables: create a `.env` file (ignored by git) using the template below.
```
# .env
NEXT_PUBLIC_API_BASE=https://psxterminal.com/api
NEXT_PUBLIC_API_PROXY=
CACHE_TTL_SECONDS=8
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net
# Optional override (defaults to "portfolioTrack")
MONGODB_DB=
# Gemini AI API Key for market insights
GEMINI_API_KEY=
```
   The app uses a Next.js rewrite (`next.config.js`) to forward `/api/psx/*` to PSX Terminal. Leave `NEXT_PUBLIC_API_PROXY` blank for same-origin requests, or set it to a custom reverse proxy base path when deploying behind a CDN or API gateway.

4. Start the development server.
```
npm run dev
```
5. Visit `http://localhost:3000` to view the dashboard.

### Environment Variable Reference
- `NEXT_PUBLIC_API_BASE` (optional): full URL for the PSX Terminal REST API. Defaults to `https://psxterminal.com/api` if unset.
- `NEXT_PUBLIC_API_PROXY` (optional): prefix applied to API calls when you serve the app from a separate domain/path.
- `CACHE_TTL_SECONDS` (optional): future hook for server-side caching. Client-side caching is managed via `CacheManager` today.
- `MONGODB_URI` (required): MongoDB connection string used to persist user accounts, portfolios, and watchlists.
- `MONGODB_DB` (optional): database name to use for MongoDB operations. Falls back to `portfolioTrack`.
- `GEMINI_API_KEY` (optional): Google Gemini API key for AI-powered market insights and portfolio analysis.
- `JWT_SECRET` (required for production): Secret key for JWT token generation. Use `openssl rand -base64 32` to generate a secure key.

## Authentication & Persistence
- User registration persists accounts to MongoDB with bcrypt-hashed passwords via App Router APIs under `app/api/auth/*`.
- **JWT Authentication**: Secure httpOnly cookies store JWT tokens (7-day expiry) for session management.
- Each user has their own portfolio and watchlist stored in separate MongoDB collections (`portfolios`, `watchlists`).
- First-time users are auto-initialized with default holdings from `initialPortfolioData`.
- Sign up or sign in through `/signup` and `/signin`; the dashboard (`/`) redirects to `/signin` if not authenticated.

## AI-Powered Insights
- Click the "AI Insights" button in the dashboard header to access:
  - **Portfolio Prices**: Get latest price data for all holdings
  - **Market Trends**: PSX market overview, indices, and sentiment
  - **Stock Analysis**: Comprehensive analysis for individual stocks
  - **Symbol Data Extraction**: Fetch structured PSX data and save to MongoDB
- AI responses are cached in MongoDB for 24 hours to reduce API costs
- Click "Refresh Analysis" to generate fresh insights
- Requires `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Portfolio Management
- **Add Holdings**: Click "Add Stock" button to add new positions
- **Edit Holdings**: Click edit icon in table to update shares or average buy price
- **Delete Holdings**: Click delete icon with confirmation prompt
- **Export Data**: Download portfolio and watchlist as JSON or CSV
- **Import Data**: Upload JSON file to bulk import holdings and watchlist items
- All changes persist to MongoDB and are user-specific

## Analytics & Insights
- Access user-specific analytics via `/api/analytics`
- Metrics include: total stocks, investment amount, average holding size, largest position, concentration risk
- Top 5 holdings analysis with percentage breakdown

## Available Scripts
- `npm run dev` – start the development server with fast refresh.
- `npm run build` – create a production build.
- `npm run start` – serve the production build.
- `npm run lint` – run ESLint using Next.js defaults.

## Working with Data & Caching
- Quotes are cached per symbol in `localStorage` under `psx_stock_prices`. `CacheManager` shows how many entries exist, the oldest cache, and the last saved timestamp.
- To force-refresh data, open the Cache widget and clear the cache; the next render will fetch fresh quotes.
- Requests to `/api/psx/ticks/REG/:symbol` are rate limited upstream. `fetchAllStockPrices` staggers requests by 100 ms to stay polite.

## Optional Modules
Several legacy components – for example `LiveTicker`, `MarketStats`, and chart clients under `components/` – ship with the codebase but are not mounted on the main page. Feel free to wire them back in if you expand the dashboard; some of them expect extra environment variables such as `NEXT_PUBLIC_WS_URL` for realtime feeds.

## Troubleshooting
- If you see "Failed to load some stock prices", the app fell back to seeded prices. Check network access to `https://psxterminal.com/api` or adjust the proxy settings.
- Clearing browser storage resets cached quotes and will force new API calls on the next load.
- When deploying behind a different domain, update `next.config.js` or supply `NEXT_PUBLIC_API_PROXY` so API calls remain same-origin.

## License
This project is provided as-is for personal portfolio tracking. Adapt or extend licensing notes here to match your needs.
