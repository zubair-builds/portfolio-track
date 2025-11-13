# Portfolio Track API Documentation

**Version:** 1.0.0  
**Base URL:** `https://your-domain.com/api`  
**Last Updated:** November 2025

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Portfolio Management](#portfolio-management)
- [Watchlist Management](#watchlist-management)
- [Symbol Data](#symbol-data)
- [Company Information](#company-information)
- [Dividends](#dividends)
- [Price History (K-Lines)](#price-history-k-lines)
- [Market Indices](#market-indices)
- [Analytics](#analytics)
- [AI Insights](#ai-insights)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All authenticated endpoints require either:
- **JWT Cookie** (set after login) - Recommended for web
- **X-User-Id Header** (user's email) - For backward compatibility

### Sign Up

Create a new user account.

**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Validation:**
- Password must be at least 6 characters
- Email must be valid format
- Email must be unique

**Success Response (200):**
```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-11-11T10:00:00.000Z",
    "updatedAt": "2025-11-11T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid payload or password too short
- `409` - Email already exists

---

### Sign In

Authenticate an existing user.

**Endpoint:** `POST /api/auth/signin`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-11-11T10:00:00.000Z",
    "updatedAt": "2025-11-11T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid payload
- `401` - Invalid credentials

**Note:** Sets HTTP-only JWT cookie on success.

---

### Sign Out

Log out the current user.

**Endpoint:** `POST /api/auth/signout`

**Authentication:** Required

**Success Response (200):**
```json
{
  "message": "Signed out successfully."
}
```

---

### Check Authentication

Verify current authentication status.

**Endpoint:** `GET /api/auth/check`

**Authentication:** Required

**Success Response (200):**
```json
{
  "authenticated": true,
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Unauthenticated Response (401):**
```json
{
  "authenticated": false
}
```

---

## Portfolio Management

### Get Portfolio

Retrieve the user's portfolio holdings.

**Endpoint:** `GET /api/portfolio`

**Authentication:** Required

**Success Response (200):**
```json
{
  "portfolio": [
    {
      "symbol": "OGDC",
      "shares": 500,
      "avgBuy": 85.50,
      "addedAt": "2025-11-11T10:00:00.000Z"
    },
    {
      "symbol": "PPL",
      "shares": 300,
      "avgBuy": 120.75,
      "addedAt": "2025-11-10T15:30:00.000Z"
    }
  ]
}
```

**Note:** First-time users receive default portfolio stocks automatically.

---

### Add Stock to Portfolio

Add a new stock or update existing holding.

**Endpoint:** `POST /api/portfolio`

**Authentication:** Required

**Request Body:**
```json
{
  "symbol": "OGDC",
  "shares": 500,
  "avgBuy": 85.50
}
```

**Validation:**
- `symbol` (string, required) - Stock symbol
- `shares` (number, required) - Must be positive
- `avgBuy` (number, required) - Must be positive

**Success Response (200):**
```json
{
  "success": true,
  "message": "OGDC added to portfolio."
}
```

**Error Responses:**
- `400` - Invalid parameters
- `401` - Authentication required
- `500` - Server error

---

### Delete Stock from Portfolio

Remove a stock from the portfolio.

**Endpoint:** `DELETE /api/portfolio?symbol=OGDC`

**Authentication:** Required

**Query Parameters:**
- `symbol` (string, required) - Stock symbol to remove

**Success Response (200):**
```json
{
  "success": true,
  "message": "OGDC removed from portfolio."
}
```

**Error Responses:**
- `400` - Symbol parameter missing
- `401` - Authentication required

---

### Export Portfolio

Export portfolio data as CSV.

**Endpoint:** `GET /api/portfolio/export`

**Authentication:** Required

**Success Response (200):**
- Content-Type: `text/csv`
- Returns CSV file with portfolio data

**CSV Format:**
```csv
Symbol,Shares,AvgBuy,AddedAt
OGDC,500,85.50,2025-11-11T10:00:00.000Z
PPL,300,120.75,2025-11-10T15:30:00.000Z
```

---

### Import Portfolio

Import portfolio from CSV file.

**Endpoint:** `POST /api/portfolio/import`

**Authentication:** Required

**Request Body:**
```json
{
  "csvData": "Symbol,Shares,AvgBuy\nOGDC,500,85.50\nPPL,300,120.75",
  "mode": "merge"
}
```

**Parameters:**
- `csvData` (string, required) - CSV content
- `mode` (string, optional) - `merge` or `replace` (default: `merge`)

**Success Response (200):**
```json
{
  "success": true,
  "imported": 2,
  "skipped": 0,
  "errors": []
}
```

---

## Watchlist Management

### Get Watchlist

Retrieve the user's watchlist.

**Endpoint:** `GET /api/watchlist`

**Authentication:** Required

**Success Response (200):**
```json
{
  "watchlist": [
    {
      "symbol": "HBL",
      "thesis": "Bullish",
      "targetPrice": 150.00,
      "note": "Strong banking fundamentals",
      "addedAt": "2025-11-11T10:00:00.000Z"
    }
  ]
}
```

---

### Add Symbol to Watchlist

Add a symbol to the watchlist.

**Endpoint:** `POST /api/watchlist`

**Authentication:** Required

**Request Body:**
```json
{
  "symbol": "HBL",
  "thesis": "Bullish",
  "targetPrice": 150.00,
  "note": "Strong banking fundamentals"
}
```

**Parameters:**
- `symbol` (string, required)
- `thesis` (string, optional) - "Bullish", "Bearish", or "Neutral"
- `targetPrice` (number, optional)
- `note` (string, optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "HBL added to watchlist."
}
```

---

### Delete from Watchlist

Remove a symbol from the watchlist.

**Endpoint:** `DELETE /api/watchlist?symbol=HBL`

**Authentication:** Required

**Query Parameters:**
- `symbol` (string, required)

**Success Response (200):**
```json
{
  "success": true,
  "message": "HBL removed from watchlist."
}
```

---

## Symbol Data

### Get Symbol Metadata

Get metadata for a single symbol.

**Endpoint:** `GET /api/symbols/metadata?symbol=OGDC`

**Query Parameters:**
- `symbol` (string, required)

**Success Response (200):**
```json
{
  "success": true,
  "metadata": {
    "symbol": "OGDC",
    "name": "Oil & Gas Development Company Limited",
    "sectorName": "Oil & Gas Exploration",
    "isETF": false,
    "isDebt": false,
    "isGEM": false,
    "currentPrice": 85.50,
    "priceChange": 2.30,
    "priceChangePercent": 2.76
  }
}
```

**Error Responses:**
- `400` - Missing symbol parameter
- `404` - Symbol not found

---

### Batch Get Symbol Metadata

Get metadata for multiple symbols in one request.

**Endpoint:** `POST /api/symbols/metadata`

**Request Body:**
```json
{
  "symbols": ["OGDC", "PPL", "HBL"]
}
```

**Success Response (200):**
```json
{
  "metadata": {
    "OGDC": {
      "symbol": "OGDC",
      "name": "Oil & Gas Development Company Limited",
      "sectorName": "Oil & Gas Exploration",
      "currentPrice": 85.50,
      "priceChange": 2.30,
      "priceChangePercent": 2.76
    },
    "PPL": {
      "symbol": "PPL",
      "name": "Pakistan Petroleum Limited",
      "sectorName": "Oil & Gas Exploration",
      "currentPrice": 120.75,
      "priceChange": -1.25,
      "priceChangePercent": -1.02
    }
  }
}
```

---

### Search Symbols

Search for symbols with filters and pagination.

**Endpoint:** `GET /api/symbols/search`

**Query Parameters:**
- `q` (string, optional) - Search query (searches symbol, name, sector)
- `limit` (number, optional) - Results per page (default: 10, max: 50)
- `offset` (number, optional) - Pagination offset (default: 0)
- `exclude` (string, optional) - Comma-separated symbols to exclude

**Example:**
```
GET /api/symbols/search?q=oil&limit=10&offset=0&exclude=OGDC,PPL
```

**Success Response (200):**
```json
{
  "symbols": [
    {
      "symbol": "APL",
      "name": "Attock Petroleum Limited",
      "sectorName": "Oil & Gas Marketing",
      "isETF": false,
      "isDebt": false,
      "isGEM": false,
      "currentPrice": 320.50
    }
  ],
  "total": 15,
  "hasMore": true,
  "limit": 10,
  "offset": 0
}
```

---

### Refresh Symbol Prices

Force refresh of symbol prices from PSX API.

**Endpoint:** `POST /api/symbols/refresh-prices`

**Request Body:**
```json
{
  "symbols": ["OGDC", "PPL"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "refreshed": 2,
  "symbols": ["OGDC", "PPL"]
}
```

---

### Get Symbol Price Stats

Get statistics about cached symbol prices.

**Endpoint:** `GET /api/symbols/stats`

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalSymbols": 550,
    "oldestCache": 1699704000000,
    "latestCache": 1699790400000
  }
}
```

---

## Company Information

### Get Company Data

Get detailed company information for a symbol.

**Endpoint:** `GET /api/companies/{symbol}`

**Path Parameters:**
- `symbol` - Stock symbol (e.g., "OGDC")

**Success Response (200):**
```json
{
  "success": true,
  "company": {
    "symbol": "OGDC",
    "name": "Oil & Gas Development Company Limited",
    "sectorName": "Oil & Gas Exploration",
    "marketCap": 365000000000,
    "shares": 4268371264,
    "freeFloat": 851674252,
    "freeFloatPercent": 19.95,
    "businessDescription": "OGDC is the leading exploration and production company...",
    "keyPeople": [
      {
        "name": "Ahmed Hayat Lak",
        "position": "Managing Director & CEO"
      }
    ],
    "scrapedAt": "2025-11-11T10:00:00.000Z",
    "lastUpdated": "2025-11-11T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `404` - Company data not found

---

### Refresh Company Data

Fetch fresh company data from PSX Terminal API.

**Endpoint:** `POST /api/companies/{symbol}/refresh`

**Path Parameters:**
- `symbol` - Stock symbol

**Success Response (200):**
```json
{
  "success": true,
  "message": "Company data refreshed successfully.",
  "company": { /* company data object */ }
}
```

---

### Get Free Float History

Get historical free float changes for a symbol.

**Endpoint:** `GET /api/companies/{symbol}/freefloat-history?limit=10`

**Path Parameters:**
- `symbol` - Stock symbol

**Query Parameters:**
- `limit` (number, optional) - Number of records (default: 10, max: 100)

**Success Response (200):**
```json
{
  "success": true,
  "symbol": "OGDC",
  "count": 5,
  "history": [
    {
      "date": "2025-11-11T00:00:00.000Z",
      "shares": 4268371264,
      "freeFloat": 851674252,
      "freeFloatPercent": 19.95
    },
    {
      "date": "2025-10-15T00:00:00.000Z",
      "shares": 4268371264,
      "freeFloat": 840000000,
      "freeFloatPercent": 19.68
    }
  ]
}
```

---

### Get All Companies

Get list of all companies (paginated).

**Endpoint:** `GET /api/companies?limit=50&offset=0`

**Query Parameters:**
- `limit` (number, optional) - Results per page (default: 50)
- `offset` (number, optional) - Pagination offset (default: 0)

**Success Response (200):**
```json
{
  "success": true,
  "companies": [
    {
      "symbol": "OGDC",
      "name": "Oil & Gas Development Company Limited",
      "sectorName": "Oil & Gas Exploration",
      "marketCap": 365000000000
    }
  ],
  "total": 550,
  "limit": 50,
  "offset": 0
}
```

---

## Dividends

### Get Dividend History

Get dividend payment history for a symbol.

**Endpoint:** `GET /api/dividends/{symbol}`

**Path Parameters:**
- `symbol` - Stock symbol

**Query Parameters:**
- `limit` (number, optional) - Number of records
- `year` (number, optional) - Filter by year
- `summary` (boolean, optional) - Include summary statistics

**Example:**
```
GET /api/dividends/OGDC?limit=10&year=2025
GET /api/dividends/OGDC?summary=true
```

**Success Response (200):**
```json
{
  "success": true,
  "symbol": "OGDC",
  "dividends": [
    {
      "exDate": "2025-03-15T00:00:00.000Z",
      "paymentDate": "2025-04-01T00:00:00.000Z",
      "amount": 5.00,
      "year": 2025
    }
  ],
  "summary": {
    "symbol": "OGDC",
    "totalDividends": 20.00,
    "dividendCount": 4,
    "avgDividend": 5.00,
    "lastDividend": {
      "exDate": "2025-03-15T00:00:00.000Z",
      "paymentDate": "2025-04-01T00:00:00.000Z",
      "amount": 5.00,
      "year": 2025
    },
    "nextDividend": null
  }
}
```

---

### Refresh Dividend Data

Fetch fresh dividend data from PSX Terminal API.

**Endpoint:** `POST /api/dividends/{symbol}/refresh`

**Path Parameters:**
- `symbol` - Stock symbol

**Success Response (200):**
```json
{
  "success": true,
  "message": "Dividend data refreshed successfully.",
  "dividends": [ /* array of dividend records */ ]
}
```

---

### Get All Dividends

Get dividend records for all symbols.

**Endpoint:** `GET /api/dividends`

**Query Parameters:**
- `limit` (number, optional)
- `offset` (number, optional)

**Success Response (200):**
```json
{
  "success": true,
  "dividends": [ /* array of all dividend records */ ],
  "total": 1500
}
```

---

## Price History (K-Lines)

### Get Price History

Get historical price data (candlesticks) for a symbol.

**Endpoint:** `GET /api/klines/{symbol}?interval=1d&limit=365`

**Path Parameters:**
- `symbol` - Stock symbol

**Query Parameters:**
- `interval` (string, optional) - Time interval (default: "1d")
  - Supported: "1d", "1w", "1M"
- `limit` (number, optional) - Number of candles (default: 365)

**Success Response (200):**
```json
{
  "success": true,
  "symbol": "OGDC",
  "interval": "1d",
  "data": [
    {
      "date": "2025-11-11T00:00:00.000Z",
      "open": 84.50,
      "high": 86.00,
      "low": 84.00,
      "close": 85.50,
      "volume": 1500000
    }
  ],
  "count": 365
}
```

---

### Fetch and Store Price History

Fetch 5 years of historical data from PSX API and store locally.

**Endpoint:** `POST /api/klines/fetch`

**Request Body:**
```json
{
  "symbol": "OGDC",
  "interval": "1d"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "symbol": "OGDC",
  "stored": 1250,
  "message": "Historical data fetched and stored successfully."
}
```

**Note:** This operation may take 10-15 seconds as it fetches 5 years of data.

---

## Market Indices

### Get Index Data

Get current data for a market index.

**Endpoint:** `GET /api/indices/{symbol}`

**Path Parameters:**
- `symbol` - Index symbol (e.g., "KSE100", "KMI30")

**Success Response (200):**
```json
{
  "success": true,
  "index": {
    "symbol": "KSE100",
    "name": "KSE 100 Index",
    "currentValue": 65432.50,
    "change": 450.30,
    "changePercent": 0.69,
    "high": 65500.00,
    "low": 65000.00,
    "lastUpdated": "2025-11-11T10:00:00.000Z"
  }
}
```

---

### Get Index History

Get historical data for an index.

**Endpoint:** `GET /api/indices/{symbol}/history?days=30`

**Path Parameters:**
- `symbol` - Index symbol

**Query Parameters:**
- `days` (number, optional) - Number of days (default: 30)

**Success Response (200):**
```json
{
  "success": true,
  "symbol": "KSE100",
  "history": [
    {
      "date": "2025-11-11T00:00:00.000Z",
      "value": 65432.50,
      "change": 450.30,
      "changePercent": 0.69
    }
  ]
}
```

---

### Get All Indices

Get data for all market indices.

**Endpoint:** `GET /api/indices`

**Success Response (200):**
```json
{
  "success": true,
  "indices": [
    {
      "symbol": "KSE100",
      "name": "KSE 100 Index",
      "currentValue": 65432.50,
      "change": 450.30,
      "changePercent": 0.69
    },
    {
      "symbol": "KMI30",
      "name": "KMI 30 Index",
      "currentValue": 95123.45,
      "change": -150.20,
      "changePercent": -0.16
    }
  ]
}
```

---

### Refresh Index Data

Refresh index data from PSX API.

**Endpoint:** `POST /api/indices/refresh`

**Success Response (200):**
```json
{
  "success": true,
  "refreshed": 6,
  "message": "All indices refreshed successfully."
}
```

---

## Analytics

### Get Portfolio Analytics

Get analytics and insights for user's portfolio.

**Endpoint:** `GET /api/analytics`

**Authentication:** Required

**Success Response (200):**
```json
{
  "analytics": {
    "totalStocks": 10,
    "totalInvestment": 1500000.00,
    "averageHoldingSize": 150000.00,
    "largestPosition": {
      "symbol": "OGDC",
      "value": 425000.00,
      "percentage": 28.33
    },
    "concentrationRisk": 65.50,
    "topFiveHoldings": [
      {
        "symbol": "OGDC",
        "value": 425000.00,
        "percentage": 28.33
      }
    ]
  }
}
```

---

## AI Insights

### Generate AI Analysis

Generate AI-powered insights and analysis.

**Endpoint:** `POST /api/ai/insights`

**Request Body:**

**For Single Stock Analysis:**
```json
{
  "mode": "stock",
  "symbol": "OGDC",
  "forceRefresh": false
}
```

**For Portfolio Analysis:**
```json
{
  "mode": "portfolio",
  "stocks": [
    { "symbol": "OGDC", "shares": 500, "avgBuy": 85.50 },
    { "symbol": "PPL", "shares": 300, "avgBuy": 120.75 }
  ]
}
```

**For Market Analysis:**
```json
{
  "mode": "market"
}
```

**For Structured Symbol Data:**
```json
{
  "mode": "symbols",
  "symbol": "OGDC"
}
```

**Modes:**
- `stock` - Comprehensive stock analysis (streaming response)
- `portfolio` - Portfolio-level insights (streaming response)
- `market` - Market overview and trends (streaming response)
- `symbols` - Extract structured data (JSON response)

**Success Response (streaming for stock/portfolio/market):**
- Content-Type: `text/plain; charset=utf-8`
- Returns streaming text analysis
- Headers include cache information

**Success Response (JSON for symbols mode):**
```json
{
  "success": true,
  "message": "Structured data for OGDC extracted and saved successfully.",
  "data": {
    "symbol": "OGDC",
    "currentPrice": 85.50,
    "priceOpen": 84.50,
    "priceHigh": 86.00,
    "priceLow": 84.00,
    "marketCap": 365000000000,
    "peRatio": 8.5,
    "dividendYield": 5.85,
    /* ... more fields ... */
  }
}
```

**Notes:**
- Results are cached for performance
- Use `forceRefresh: true` to bypass cache
- Stock analysis requires prior analysis before using symbols mode

---

## Admin Endpoints

### Symbol Synchronization

**Start Sync:** `POST /api/admin/sync/start`
**Stop Sync:** `POST /api/admin/sync/stop`
**Get Status:** `GET /api/admin/sync/status`
**Get Progress:** `GET /api/admin/sync/progress`
**Get Stats:** `GET /api/admin/sync/stats`
**Retry Failed:** `POST /api/admin/sync/retry`
**SSE Events:** `GET /api/admin/sync/events`

**Sync Symbols:** `POST /api/admin/sync-symbols`

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

---

## Rate Limiting

**Current Implementation:** No rate limiting

**Recommended for Production:**
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user
- Stricter limits for expensive operations (AI, data fetching)

---

## Data Types

### Symbol Metadata
```typescript
{
  symbol: string;
  name: string;
  sectorName: string;
  isETF: boolean;
  isDebt: boolean;
  isGEM: boolean;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
}
```

### Portfolio Stock
```typescript
{
  symbol: string;
  shares: number;
  avgBuy: number;
  addedAt: Date;
}
```

### Watchlist Item
```typescript
{
  symbol: string;
  thesis?: "Bullish" | "Bearish" | "Neutral";
  targetPrice?: number;
  note?: string;
  addedAt: Date;
}
```

### Dividend Record
```typescript
{
  exDate: Date;
  paymentDate: Date;
  amount: number;
  year: number;
}
```

### K-Line (Candlestick)
```typescript
{
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

---

## Best Practices for Mobile Apps

### Authentication
1. Store JWT token securely (iOS Keychain, Android KeyStore)
2. Include token in Cookie header or use X-User-Id for testing
3. Implement automatic token refresh
4. Handle 401 responses by redirecting to login

### Data Caching
1. Cache symbol metadata locally
2. Implement pull-to-refresh for real-time data
3. Use background sync for portfolio updates
4. Cache AI analyses for offline viewing

### Performance
1. Batch symbol metadata requests when possible
2. Use pagination for large lists
3. Implement lazy loading for historical data
4. Debounce search queries

### Error Handling
1. Show user-friendly error messages
2. Implement retry logic for network failures
3. Cache failed requests for offline retry
4. Provide fallback UI for missing data

### Real-time Updates
1. Use SSE for sync progress monitoring
2. Poll analytics endpoint for dashboard updates
3. Refresh portfolio data on app foreground
4. Update prices every 30-60 seconds during market hours

---

## Example Mobile App Flows

### 1. User Login Flow
```
1. POST /api/auth/signin
2. Store JWT token
3. GET /api/portfolio
4. GET /api/watchlist
5. Display dashboard
```

### 2. Add Stock to Portfolio Flow
```
1. GET /api/symbols/search?q=OGDC
2. Select symbol from results
3. User enters shares and avgBuy
4. POST /api/portfolio
5. GET /api/portfolio (refresh)
6. Update UI
```

### 3. View Stock Details Flow
```
1. GET /api/symbols/metadata?symbol=OGDC
2. GET /api/companies/OGDC
3. GET /api/dividends/OGDC
4. GET /api/klines/OGDC?interval=1d&limit=365
5. Display comprehensive view
6. Optional: POST /api/ai/insights (stock analysis)
```

### 4. Portfolio Analytics Flow
```
1. GET /api/portfolio
2. POST /api/symbols/metadata (batch get prices)
3. GET /api/analytics
4. Calculate and display metrics
```

---

## Support & Contact

For API support and questions:
- **Documentation:** This file
- **Backend Code:** `/app/api/*` directories
- **Data Models:** `/lib/*` files

---

## Changelog

### Version 1.0.0 (November 2025)
- Initial API documentation
- All core endpoints documented
- Authentication system
- Portfolio and watchlist management
- Symbol data and search
- Company information and dividends
- Price history (K-lines)
- Market indices
- Analytics and AI insights

