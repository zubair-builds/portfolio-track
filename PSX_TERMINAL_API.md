
# PSX Terminal API Documentation

> Comprehensive reference for all PSX Terminal API endpoints used in the PortfolioTrack application

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Rate Limits](#rate-limits)
3. [Common Headers](#common-headers)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
   - [Stock Prices](#1-stock-prices)
   - [Index Prices](#2-index-prices)
   - [Stock Fundamentals](#3-stock-fundamentals)
6. [Usage Examples](#usage-examples)
7. [Where Used](#where-used)

---

## API Overview

**Base URL:** `https://psxterminal.com/api`

The PSX Terminal API provides real-time and fundamental data for Pakistan Stock Exchange securities and indices.

---

## Rate Limits

### ⚠️ CRITICAL: Maximum 100 Requests Per Minute

**PSX Terminal API strictly enforces a hard limit of 100 requests per minute.**

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Hard Limit** | 100 requests/minute | Strictly enforced by PSX Terminal |
| **Recommended Delay** | 650ms between requests | ~92 req/min for safety margin |
| **Minimum Delay** | 600ms | 60,000ms ÷ 100 = 600ms |
| **Safety Buffer** | +50ms | Prevents timing variations/network delays |
| **Status Code** | 429 | "Too Many Requests" when exceeded |
| **Recovery Time** | 60 seconds | Wait before retrying after 429 |

### Rate Limiting Implementation

**Recommended Pattern (used in all scripts):**

```typescript
const RATE_LIMIT_DELAY = 650; // milliseconds
const MAX_REQUESTS_PER_MINUTE = 100;

// Sequential requests with delay
for (const symbol of symbols) {
  const data = await fetchData(symbol);
  
  // Wait before next request (except for last one)
  if (symbols.indexOf(symbol) < symbols.length - 1) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }
}
```

**Handling Rate Limit Errors:**

```typescript
if (response.status === 429) {
  console.log('Rate limit hit. Waiting 60 seconds...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  return fetchData(symbol); // Retry
}
```

---

## Common Headers

All API requests require these headers:

```http
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Accept: application/json
Referer: https://psxterminal.com/
```

**TypeScript/Fetch Implementation:**

```typescript
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Referer': 'https://psxterminal.com/',
};

const response = await fetch(url, { headers });
```

---

## Error Handling

### HTTP Status Codes

| Status Code | Meaning | Action |
|-------------|---------|--------|
| **200** | Success | Process response data |
| **404** | Symbol not found or invalid | Skip or report error |
| **429** | Rate limit exceeded | Wait 60s, then retry |
| **500+** | Server error | Retry with backoff |
| **Network errors** | Connection issues | Retry with backoff |

### Retry Strategy

**Recommended Configuration:**

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function fetchWithRetry(url: string, retryCount: number = 0): Promise<Response> {
  try {
    const response = await fetch(url, { headers });
    
    if (response.status === 429) {
      console.log('Rate limit hit. Waiting 60s...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return fetchWithRetry(url, retryCount);
    }
    
    if (response.status === 404) {
      return null; // Symbol not found
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retryCount + 1);
    }
    throw error;
  }
}
```

### Timestamp Handling

PSX API returns timestamps in two formats:

- **Seconds (10 digits):** Multiply by 1000
- **Milliseconds (13 digits):** Use as-is

**Detection Logic:**

```typescript
const normalizedTimestamp = apiData.timestamp > 1_000_000_000_000
  ? apiData.timestamp          // Already in milliseconds
  : apiData.timestamp * 1000;  // Convert seconds to milliseconds

const date = new Date(normalizedTimestamp);
```

---

## Endpoints

### 1. Stock Prices

Fetch real-time price data for individual stocks.

#### Endpoint

```
GET /api/ticks/REG/{SYMBOL}
```

**Full URL:**
```
https://psxterminal.com/api/ticks/REG/HUBC
```

#### Request

**Method:** GET  
**URL Pattern:** `/api/ticks/REG/{SYMBOL}`  
**Parameters:**
- `{SYMBOL}` - Stock symbol (case-insensitive, e.g., `HUBC`, `PSO`, `OGDC`)

**Headers:** [Common headers](#common-headers)

#### Response

**TypeScript Interface:**

```typescript
interface StockPriceResponse {
  success: boolean;
  data: {
    symbol: string;          // "HUBC"
    market: string;          // "REG" (Regular Market)
    st: string;              // Status (e.g., "SUS" for suspended)
    price: number;           // Current price
    change: number;          // Price change
    changePercent: number;   // Change percentage (decimal, e.g., 0.0234 = 2.34%)
    volume: number;          // Trading volume
    trades: number;          // Number of trades
    value: number;           // Total value traded
    high: number;            // Day's high
    low: number;             // Day's low
    bid: number;             // Best bid price
    ask: number;             // Best ask price
    bidVol: number;          // Bid volume
    askVol: number;          // Ask volume
    timestamp: number;       // Unix timestamp (seconds or milliseconds)
  };
  timestamp: number;         // API response timestamp (milliseconds)
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "HUBC",
    "market": "REG",
    "st": "SUS",
    "price": 85.50,
    "change": 2.30,
    "changePercent": 0.0276,
    "volume": 1234567,
    "trades": 4523,
    "value": 105567890.50,
    "high": 86.00,
    "low": 84.20,
    "bid": 85.45,
    "ask": 85.55,
    "bidVol": 5000,
    "askVol": 3500,
    "timestamp": 1699456789
  },
  "timestamp": 1699456789123
}
```

#### Used In

- `app/api/symbols/fetch-price/route.ts` - API endpoint for fetching symbol prices
- `lib/symbolsStore.ts` - Direct symbol price fetching in utility functions

#### Example Usage

```typescript
const symbol = 'HUBC';
const response = await fetch(
  `https://psxterminal.com/api/ticks/REG/${symbol.toUpperCase()}`,
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://psxterminal.com/',
    },
  }
);

const result = await response.json();

if (result.success && result.data) {
  console.log(`${result.data.symbol}: ${result.data.price}`);
  console.log(`Change: ${(result.data.changePercent * 100).toFixed(2)}%`);
}
```

---

### 2. Index Prices

Fetch real-time price data for market indices.

#### Endpoint

```
GET /api/ticks/IDX/{SYMBOL}
```

**Full URL:**
```
https://psxterminal.com/api/ticks/IDX/KSE100
```

#### Request

**Method:** GET  
**URL Pattern:** `/api/ticks/IDX/{SYMBOL}`  
**Parameters:**
- `{SYMBOL}` - Index symbol (case-insensitive, e.g., `KSE100`, `KMI30`, `ALLSHR`)

**Headers:** [Common headers](#common-headers)

#### Response

**TypeScript Interface:**

```typescript
interface IndexPriceResponse {
  success: boolean;
  data: {
    market: string;          // "IDX" (Index Market)
    st: string;              // Status (e.g., "SUS")
    symbol: string;          // "KSE100"
    price: number;           // Current index value
    change: number;          // Points change
    changePercent: number;   // Change percentage (decimal)
    volume: number;          // Total market volume
    trades: number;          // Total number of trades
    value: number;           // Total value traded
    high: number;            // Day's high
    low: number;             // Day's low
    bid: number;             // Usually 0 for indices
    ask: number;             // Usually 0 for indices
    bidVol: number;          // Usually 0 for indices
    askVol: number;          // Usually 0 for indices
    timestamp: number;       // Unix timestamp (seconds or milliseconds)
  };
  timestamp: number;         // API response timestamp (milliseconds)
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "market": "IDX",
    "st": "SUS",
    "symbol": "KSE100",
    "price": 109847.23,
    "change": 1234.56,
    "changePercent": 0.0114,
    "volume": 245367890,
    "trades": 125432,
    "value": 11567890123.45,
    "high": 110123.45,
    "low": 109456.78,
    "bid": 0,
    "ask": 0,
    "bidVol": 0,
    "askVol": 0,
    "timestamp": 1699456789
  },
  "timestamp": 1699456789123
}
```

#### Used In

- `app/api/indices/refresh/route.ts` - API endpoint for refreshing index prices
- `scripts/fetch-index-prices.ts` - CLI script for batch fetching index prices

#### Example Usage

```typescript
const symbol = 'KSE100';
const response = await fetch(
  `https://psxterminal.com/api/ticks/IDX/${symbol.toUpperCase()}`,
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://psxterminal.com/',
    },
  }
);

const result = await response.json();

if (result.success && result.data) {
  console.log(`${result.data.symbol}: ${result.data.price.toLocaleString()}`);
  console.log(`Change: ${result.data.change >= 0 ? '+' : ''}${result.data.change.toFixed(2)}`);
}
```

---

### 3. Stock Fundamentals

Fetch fundamental analysis data for stocks.

#### Endpoint

```
GET /api/fundamentals/{SYMBOL}
```

**Full URL:**
```
https://psxterminal.com/api/fundamentals/HUBC
```

#### Request

**Method:** GET  
**URL Pattern:** `/api/fundamentals/{SYMBOL}`  
**Parameters:**
- `{SYMBOL}` - Stock symbol (case-insensitive)

**Headers:** [Common headers](#common-headers)

#### Response

**TypeScript Interface:**

```typescript
interface FundamentalsResponse {
  success: boolean;
  data: {
    symbol: string;          // "HUBC"
    sector: string;          // Sector code (e.g., "0830")
    listedIn: string;        // Comma-separated indices (e.g., "KSE100,KMI30,ALLSHR")
    marketCap: string;       // Market cap with units (e.g., "511.4M", "1.2B")
    price: number;           // Current price
    changePercent: number;   // Change percentage
    yearChange: number;      // Year-to-date change percentage
    peRatio: number;         // Price-to-Earnings ratio
    dividendYield: number;   // Dividend yield percentage
    freeFloat: string;       // Free float with units (e.g., "11.9M")
    volume30Avg: number;     // 30-day average volume
    isNonCompliant: boolean; // Compliance status
    timestamp: string;       // ISO date string
  };
  timestamp: number;         // API response timestamp (milliseconds)
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "HUBC",
    "sector": "0830",
    "listedIn": "ALLSHR,KSE100,KSE100PR,KSE30,KMI30",
    "marketCap": "85.5B",
    "price": 85.50,
    "changePercent": 2.34,
    "yearChange": 12.45,
    "peRatio": 8.5,
    "dividendYield": 5.2,
    "freeFloat": "15.4M",
    "volume30Avg": 567890,
    "isNonCompliant": false,
    "timestamp": "2025-11-07T18:32:24.203Z"
  },
  "timestamp": 1699456789123
}
```

#### Field Details

| Field | Type | Description | Example Values |
|-------|------|-------------|----------------|
| `marketCap` | string | Market capitalization with units | "511.4M", "1.2B", "85.5B" |
| `freeFloat` | string | Free float shares with units | "11.9M", "15.4M" |
| `listedIn` | string | Comma-separated index memberships | "KSE100", "KSE100,KMI30,ALLSHR" |
| `isNonCompliant` | boolean | Regulatory compliance status | `true` = non-compliant, `false` = compliant |

#### Used In

- `scripts/fetch-fundamentals.ts` - CLI script for batch fetching fundamental data

#### Example Usage

```typescript
const symbol = 'HUBC';
const response = await fetch(
  `https://psxterminal.com/api/fundamentals/${symbol.toUpperCase()}`,
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://psxterminal.com/',
    },
  }
);

const result = await response.json();

if (result.success && result.data) {
  console.log(`${result.data.symbol}`);
  console.log(`Market Cap: ${result.data.marketCap}`);
  console.log(`P/E Ratio: ${result.data.peRatio}`);
  console.log(`Listed In: ${result.data.listedIn}`);
}
```

---

### 4. Company Data

Fetch company fundamentals including free float, key people, and business description.

#### Endpoint

```
GET /api/companies/{SYMBOL}
```

**Full URL:**
```
https://psxterminal.com/api/companies/HUBC
```

#### Request

**Method:** GET  
**URL Pattern:** `/api/companies/{SYMBOL}`  
**Parameters:**
- `{SYMBOL}` - Stock symbol (case-insensitive)

**Headers:** [Common headers](#common-headers)

#### Response

**TypeScript Interface:**

```typescript
interface CompanyDataResponse {
  success: boolean;
  data: {
    symbol: string;
    scrapedAt: string;           // ISO date string
    financialStats: {
      marketCap: {
        raw: string;             // Formatted with commas (e.g., "178,190,099.93")
        numeric: number;         // Numeric value
      };
      shares: {
        raw: string;             // Total shares with commas
        numeric: number;
      };
      freeFloat: {
        raw: string;             // Free float shares with commas
        numeric: number;
      };
      freeFloatPercent: {
        raw: string;             // Percentage with % sign (e.g., "75.00%")
        numeric: number;         // Numeric percentage (e.g., 75)
      };
    };
    businessDescription: string; // Company description
    keyPeople: Array<{
      name: string;
      position: string;          // e.g., "CEO", "Chairperson", "Company Secretary"
    }>;
    error: null | string;
  };
  timestamp: number;             // Unix timestamp (milliseconds)
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "HUBC",
    "scrapedAt": "2025-06-26T19:06:53.368Z",
    "financialStats": {
      "marketCap": {
        "raw": "178,190,099.93",
        "numeric": 178190099.93
      },
      "shares": {
        "raw": "1,297,154,400",
        "numeric": 1297154400
      },
      "freeFloat": {
        "raw": "972,865,790",
        "numeric": 972865790
      },
      "freeFloatPercent": {
        "raw": "75.00%",
        "numeric": 75
      }
    },
    "businessDescription": "The Hub Power Company Limited was incorporated in Pakistan on August 1, 1991 as a public limited company. The principal activities of the Company are to develop, own, operate and maintain power stations. The Company owns an oil-fired power station of 1,200 MW (net) in Balochistan (Hub plant).",
    "keyPeople": [
      {
        "name": "Muhammad Kamran Kamal",
        "position": "CEO"
      },
      {
        "name": "Habibullah Khan",
        "position": "Chairperson"
      },
      {
        "name": "Faiza Kapadia",
        "position": "Company Secretary"
      }
    ],
    "error": null
  },
  "timestamp": 1762540212644
}
```

#### Field Details

| Field | Type | Description | Use Case |
|-------|------|-------------|----------|
| `financialStats.marketCap` | object | Market capitalization in raw and numeric formats | Company valuation analysis |
| `financialStats.shares` | object | Total outstanding shares | Ownership calculations |
| `financialStats.freeFloat` | object | Free float shares (publicly traded) | Liquidity analysis |
| `financialStats.freeFloatPercent` | object | Free float as percentage of total shares | Institutional vs retail ownership |
| `businessDescription` | string | Company's business activities and operations | Research and due diligence |
| `keyPeople` | array | CEO, Chairperson, Company Secretary | Management analysis |
| `scrapedAt` | string | When data was last scraped from PSX | Data freshness indicator |

#### Used In

- `lib/companiesStore.ts` - Company data management
- `app/api/companies/[symbol]/refresh/route.ts` - Refresh company data
- `scripts/fetch-companies.ts` - Batch fetch company data

#### Use Cases

1. **Free Float Tracking:** Monitor changes in free float over time to detect institutional accumulation/distribution
2. **Company Research:** Display business description and key people in stock details
3. **Ownership Analysis:** Calculate institutional vs retail ownership percentages
4. **Liquidity Assessment:** Evaluate trading liquidity based on free float

#### Example Usage

```typescript
const symbol = 'HUBC';
const response = await fetch(
  `https://psxterminal.com/api/companies/${symbol.toUpperCase()}`,
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://psxterminal.com/',
    },
  }
);

const result = await response.json();

if (result.success && result.data) {
  const { financialStats, keyPeople, businessDescription } = result.data;
  
  console.log(`${result.data.symbol} Company Data:`);
  console.log(`Market Cap: Rs. ${financialStats.marketCap.raw}`);
  console.log(`Free Float: ${financialStats.freeFloatPercent.raw}`);
  console.log(`CEO: ${keyPeople.find(p => p.position === 'CEO')?.name}`);
  console.log(`Description: ${businessDescription.substring(0, 100)}...`);
}
```

---

### 5. Dividend History

Fetch historical dividend payment records for a stock.

#### Endpoint

```
GET /api/dividends/{SYMBOL}
```

**Full URL:**
```
https://psxterminal.com/api/dividends/EFERT
```

#### Request

**Method:** GET  
**URL Pattern:** `/api/dividends/{SYMBOL}`  
**Parameters:**
- `{SYMBOL}` - Stock symbol (case-insensitive)

**Headers:** [Common headers](#common-headers)

#### Response

**TypeScript Interface:**

```typescript
interface DividendHistoryResponse {
  success: boolean;
  data: Array<{
    symbol: string;
    ex_date: string;         // Ex-dividend date (YYYY-MM-DD)
    payment_date: string;    // Payment date (YYYY-MM-DD)
    record_date: string;     // Record date (YYYY-MM-DD)
    amount: number;          // Dividend amount per share
    year: number;            // Calendar year
  }>;
  count: number;             // Total number of dividend records
  symbol: string;
  timestamp: number;         // Unix timestamp (milliseconds)
  cacheUpdated: string;      // ISO date string of cache update
}
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "symbol": "EFERT",
      "ex_date": "2025-10-24",
      "payment_date": "2025-11-06",
      "record_date": "2025-10-27",
      "amount": 4.5,
      "year": 2025
    },
    {
      "symbol": "EFERT",
      "ex_date": "2025-08-08",
      "payment_date": "2025-08-20",
      "record_date": "2025-08-11",
      "amount": 4.25,
      "year": 2025
    },
    {
      "symbol": "EFERT",
      "ex_date": "2025-04-30",
      "payment_date": "2025-05-14",
      "record_date": "2025-05-04",
      "amount": 2.25,
      "year": 2025
    },
    {
      "symbol": "EFERT",
      "ex_date": "2025-03-14",
      "payment_date": "2025-03-26",
      "record_date": "2025-03-17",
      "amount": 8,
      "year": 2025
    }
  ],
  "count": 4,
  "symbol": "EFERT",
  "timestamp": 1762588678347,
  "cacheUpdated": "2025-11-08T00:00:06.409Z"
}
```

#### Field Details

| Field | Type | Description | Use Case |
|-------|------|-------------|----------|
| `ex_date` | string | Ex-dividend date - last day to buy stock to receive dividend | Trading decisions |
| `payment_date` | string | Date when dividend will be paid out | Cash flow planning |
| `record_date` | string | Date to be on shareholder register | Ownership verification |
| `amount` | number | Dividend amount per share in local currency | Income calculations |
| `year` | number | Calendar year of dividend | Annual tracking |
| `count` | number | Total dividend records returned | Data completeness check |
| `cacheUpdated` | string | When PSX Terminal cache was last updated | Data freshness |

#### Important Dates Explained

```
Buy Stock ──→ Ex-Date ──→ Record Date ──→ Payment Date
             (cut-off)    (register)     (receive money)
```

- **Ex-Date:** Must own stock BEFORE this date to receive dividend
- **Record Date:** Company checks who owns shares
- **Payment Date:** Dividend amount credited to account

#### Used In

- `lib/dividendsStore.ts` - Dividend data management
- `app/api/dividends/[symbol]/refresh/route.ts` - Refresh dividend history
- `scripts/fetch-dividends.ts` - Batch fetch dividend histories

#### Use Cases

1. **Dividend Calendar:** Show upcoming ex-dates for portfolio holdings
2. **Yield Calculation:** Calculate trailing twelve-month (TTM) dividend yield
3. **Income Tracking:** Track total dividend income from portfolio
4. **Dividend Growth Analysis:** Analyze dividend growth rate over years
5. **Payment Forecasting:** Predict future dividend payments based on history

#### Example Usage

```typescript
const symbol = 'EFERT';
const response = await fetch(
  `https://psxterminal.com/api/dividends/${symbol.toLowerCase()}`,
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://psxterminal.com/',
    },
  }
);

const result = await response.json();

if (result.success && result.data) {
  console.log(`${result.symbol} Dividend History (${result.count} records):`);
  
  // Calculate total annual dividends
  const currentYear = new Date().getFullYear();
  const yearTotal = result.data
    .filter(d => d.year === currentYear)
    .reduce((sum, d) => sum + d.amount, 0);
  
  console.log(`Total ${currentYear} dividends: Rs. ${yearTotal} per share`);
  
  // Show upcoming dividends
  const today = new Date();
  const upcoming = result.data.filter(d => new Date(d.ex_date) > today);
  console.log(`Upcoming dividends: ${upcoming.length}`);
}
```

#### Calculate Dividend Yield

```typescript
async function calculateDividendYield(symbol: string, currentPrice: number) {
  const response = await fetch(`https://psxterminal.com/api/dividends/${symbol.toLowerCase()}`);
  const result = await response.json();
  
  if (!result.success) return 0;
  
  // Calculate TTM (Trailing Twelve Months) dividends
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const ttmDividends = result.data
    .filter(d => new Date(d.ex_date) >= oneYearAgo)
    .reduce((sum, d) => sum + d.amount, 0);
  
  const dividendYield = (ttmDividends / currentPrice) * 100;
  
  return dividendYield;
}

// Usage
const yield = await calculateDividendYield('EFERT', 85.50);
console.log(`Dividend Yield: ${yield.toFixed(2)}%`);
```

---

## Usage Examples

### Example 1: Fetching a Single Stock Price

```typescript
async function fetchStockPrice(symbol: string) {
  try {
    const response = await fetch(
      `https://psxterminal.com/api/ticks/REG/${symbol.toUpperCase()}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://psxterminal.com/',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('No price data available');
    }

    return {
      symbol: data.data.symbol,
      price: data.data.price,
      change: data.data.change,
      changePercent: data.data.changePercent * 100, // Convert to percentage
      volume: data.data.volume,
    };
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    return null;
  }
}

// Usage
const hubcPrice = await fetchStockPrice('HUBC');
console.log(`HUBC: Rs. ${hubcPrice?.price} (${hubcPrice?.changePercent.toFixed(2)}%)`);
```

### Example 2: Fetching an Index Price

```typescript
async function fetchIndexPrice(symbol: string) {
  try {
    const response = await fetch(
      `https://psxterminal.com/api/ticks/IDX/${symbol.toUpperCase()}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://psxterminal.com/',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('No index data available');
    }

    return {
      symbol: data.data.symbol,
      price: data.data.price,
      change: data.data.change,
      changePercent: data.data.changePercent * 100,
      high: data.data.high,
      low: data.data.low,
      volume: data.data.volume,
      trades: data.data.trades,
    };
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    return null;
  }
}

// Usage
const kse100 = await fetchIndexPrice('KSE100');
console.log(`KSE-100: ${kse100?.price.toLocaleString()} (${kse100?.change >= 0 ? '+' : ''}${kse100?.change.toFixed(2)})`);
```

### Example 3: Fetching Fundamentals Data

```typescript
async function fetchFundamentals(symbol: string) {
  try {
    const response = await fetch(
      `https://psxterminal.com/api/fundamentals/${symbol.toUpperCase()}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://psxterminal.com/',
        },
      }
    );

    if (response.status === 404) {
      return null; // Symbol not found
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return null;
    }

    return {
      symbol: data.data.symbol,
      sector: data.data.sector,
      indices: data.data.listedIn.split(','),
      marketCap: data.data.marketCap,
      peRatio: data.data.peRatio,
      dividendYield: data.data.dividendYield,
      isCompliant: !data.data.isNonCompliant,
    };
  } catch (error) {
    console.error(`Failed to fetch fundamentals for ${symbol}:`, error);
    return null;
  }
}

// Usage
const hubcFundamentals = await fetchFundamentals('HUBC');
console.log(`${hubcFundamentals?.symbol}: ${hubcFundamentals?.marketCap} market cap`);
console.log(`Listed in: ${hubcFundamentals?.indices.join(', ')}`);
```

### Example 4: Batch Fetching with Rate Limiting

```typescript
async function batchFetchPrices(symbols: string[]) {
  const RATE_LIMIT_DELAY = 650; // milliseconds
  const results: any[] = [];

  console.log(`Fetching ${symbols.length} symbols with rate limiting...`);

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    
    try {
      const data = await fetchStockPrice(symbol);
      results.push({ symbol, data, success: true });
      console.log(`✓ ${i + 1}/${symbols.length}: ${symbol}`);
    } catch (error) {
      results.push({ symbol, error, success: false });
      console.log(`✗ ${i + 1}/${symbols.length}: ${symbol} - Failed`);
    }

    // Rate limiting: wait between requests (except for last one)
    if (i < symbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\nCompleted: ${successCount}/${symbols.length} successful`);

  return results;
}

// Usage
const symbols = ['HUBC', 'PSO', 'OGDC', 'ENGRO', 'MCB'];
const results = await batchFetchPrices(symbols);
```

### Example 5: Error Handling and Retries

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function fetchWithRetry(
  url: string, 
  retryCount: number = 0
): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://psxterminal.com/',
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      console.log('⚠️  Rate limit hit. Waiting 60 seconds...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return fetchWithRetry(url, retryCount);
    }

    // Handle not found
    if (response.status === 404) {
      console.log('Symbol not found');
      return null;
    }

    // Handle other errors
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Invalid response data');
    }

    return data;
  } catch (error) {
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retryCount + 1);
    }
    
    // Max retries exceeded
    console.error(`Failed after ${MAX_RETRIES} retries:`, error);
    throw error;
  }
}

// Usage
try {
  const data = await fetchWithRetry(
    'https://psxterminal.com/api/ticks/REG/HUBC'
  );
  console.log('Success:', data);
} catch (error) {
  console.error('All retries failed:', error);
}
```

---

## Where Used

### API Endpoint Usage Reference

| PSX Terminal Endpoint | Application Files | Purpose | Implementation |
|----------------------|-------------------|---------|----------------|
| **`/api/ticks/REG/{symbol}`** | `app/api/symbols/fetch-price/route.ts` | Fetch real-time stock prices via API | Next.js API route |
| | `lib/symbolsStore.ts` | Direct stock price fetching | Utility function |
| **`/api/ticks/IDX/{symbol}`** | `app/api/indices/refresh/route.ts` | Refresh index prices on-demand | Next.js API route |
| | `scripts/fetch-index-prices.ts` | Batch fetch index prices | CLI script |
| **`/api/fundamentals/{symbol}`** | `scripts/fetch-fundamentals.ts` | Batch fetch fundamental data | CLI script |
| **`/api/companies/{symbol}`** | `app/api/companies/[symbol]/refresh/route.ts` | Refresh company data & track free float | Next.js API route |
| | `scripts/fetch-companies.ts` | Batch fetch company data | CLI script |
| | `lib/companiesStore.ts` | Company data management | Utility functions |
| **`/api/dividends/{symbol}`** | `app/api/dividends/[symbol]/refresh/route.ts` | Refresh dividend history | Next.js API route |
| | `scripts/fetch-dividends.ts` | Batch fetch dividend histories | CLI script |
| | `lib/dividendsStore.ts` | Dividend data management | Utility functions |

### Internal API Routes (Wrappers)

Our application provides wrapper API routes that abstract PSX Terminal API calls:

| Internal Route | Proxies To | Purpose |
|----------------|------------|---------|
| `GET /api/symbols/fetch-price?symbol=HUBC` | `/api/ticks/REG/HUBC` | Fetch & cache stock price |
| `GET /api/indices/refresh?symbols=KSE100` | `/api/ticks/IDX/KSE100` | Refresh index data |
| `GET /api/indices` | MongoDB (cached data) | List all indices |
| `GET /api/indices/[symbol]` | MongoDB (cached data) | Get specific index |

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PSX Terminal API                         │
│  https://psxterminal.com/api                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ /ticks/REG/  │  │ /ticks/IDX/  │  │/fundamentals/│     │
│  │   {symbol}   │  │   {symbol}   │  │   {symbol}   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│              PortfolioTrack Application                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes                                          │  │
│  │  • /api/symbols/fetch-price                          │  │
│  │  • /api/indices/refresh                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CLI Scripts                                         │  │
│  │  • scripts/fetch-index-prices.ts                     │  │
│  │  • scripts/fetch-fundamentals.ts                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Utility Libraries                                   │  │
│  │  • lib/symbolsStore.ts                               │  │
│  │  • lib/indicesStore.ts                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │   MongoDB Atlas  │
                │  symbol_prices   │
                │     indices      │
                │  index_prices    │
                └──────────────────┘
```

---

## Notes

- **Cache Strategy:** Stock prices are cached in MongoDB (`symbol_prices` collection) with `lastFetchedAt` timestamp
- **Index Updates:** Index data is denormalized - latest snapshot stored in `indices` collection, historical data in `index_prices`
- **Environment Variable:** `NEXT_PUBLIC_API_BASE` can override the base URL (defaults to `https://psxterminal.com/api`)
- **Network Proxy:** Configure `next.config.js` rewrites if running behind a proxy
- **CORS:** PSX Terminal API supports cross-origin requests with proper headers

---

## Related Documentation

- [INDICES_MOBILE_API.md](./INDICES_MOBILE_API.md) - Mobile API documentation for indices
- [FUNDAMENTALS_USAGE_GUIDE.md](./FUNDAMENTALS_USAGE_GUIDE.md) - Guide for using the fundamentals fetcher script
- [README.md](./README.md) - Main application documentation

---

**Last Updated:** November 11, 2025  
**API Version:** PSX Terminal API v1 (undocumented/unofficial)

