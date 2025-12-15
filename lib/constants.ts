/**
 * Centralized constants and utility functions for the PSX Portfolio Tracker
 * Single source of truth for priority orders, market states, formatting, and common configurations
 */

// ============================================================================
// APPLICATION METADATA
// ============================================================================

/**
 * Application name used in page titles
 */
export const APP_NAME = 'PortfolioTrack';

/**
 * Page title suffix
 */
export const PAGE_TITLE_SUFFIX = ` - ${APP_NAME}`;

// ============================================================================
// INDEX PRIORITY ORDER
// ============================================================================

/**
 * Priority order for PSX indices
 * Indices are sorted in this order across the application
 * Change this array to update the priority everywhere
 */
export const INDEX_PRIORITY_ORDER = [
  'mznpi',      // Meezan Pakistan Index
  'kmi30',      // KMI 30 Index
  'mii30',      // MII30 Index
  'kmiallshr',  // KMI All Share Index
  'kse30',      // KSE 30 Index
  'psxdiv20',   // PSX Dividend 20 Index
  'kse100',     // KSE 100 Index (Benchmark)
  'kse100pr',   // KSE 100 Price Return Index
  'bkti30',     // Banking Index
  'jsmfi',      // JS Momentum Factor Index
  'ogti',       // Oil & Gas Index
  'upp9',       // UPP9 Index
  'nitpgi',     // NIT Index
  'nbppgi',     // NBP Index
  'hbltti',     // HBL Total Treasury Index
  'jsgbkti',    // JS Global Banking Index
  'aci',        // Alfalah Consumer Index
  'allshr',     // All Share Index
] as const;

/**
 * Sort array of index symbols by priority order
 * @param indices Array of index symbols (e.g., ['KSE100', 'KMI30'])
 * @returns Sorted array with priority indices first, then alphabetically
 */
export function sortIndicesByPriority<T extends { symbol: string }>(indices: T[]): T[];
export function sortIndicesByPriority(indices: string[]): string[];
export function sortIndicesByPriority<T extends { symbol: string } | string>(
  indices: T[]
): T[] {
  return [...indices].sort((a, b) => {
    const aSymbol = typeof a === 'string' ? a : a.symbol;
    const bSymbol = typeof b === 'string' ? b : b.symbol;
    const aLower = aSymbol.toLowerCase();
    const bLower = bSymbol.toLowerCase();

    const aIndex = INDEX_PRIORITY_ORDER.findIndex(p => p === aLower);
    const bIndex = INDEX_PRIORITY_ORDER.findIndex(p => p === bLower);

    // Both are priority indices - sort by priority order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // Only a is priority - a comes first
    if (aIndex !== -1) {
      return -1;
    }
    // Only b is priority - b comes first
    if (bIndex !== -1) {
      return 1;
    }
    // Neither in priority - sort alphabetically
    return aLower.localeCompare(bLower);
  });
}

/**
 * Sort comma-separated index string by priority
 * @param listedIn Comma-separated index list (e.g., "KSE100,KMI30,ALLSHR")
 * @returns Array of sorted indices
 */
export function getSortedIndices(listedIn?: string): string[] {
  if (!listedIn) return [];
  const rawIndices = listedIn.split(',').map(idx => idx.trim()).filter(Boolean);
  return sortIndicesByPriority(rawIndices);
}

// ============================================================================
// MARKET STATE MAPPINGS
// ============================================================================

export type MarketState = 'OPN' | 'CLS' | 'SUS' | 'PRE';
export type BadgeVariant = 'success' | 'danger' | 'neutral' | 'live';

export interface MarketStateInfo {
  label: string;
  variant: BadgeVariant;
  showPulse: boolean;
}

/**
 * Market state configuration
 * Maps PSX market state codes to display properties
 */
export const MARKET_STATE_MAP: Record<MarketState, MarketStateInfo> = {
  'OPN': { label: 'Live', variant: 'live', showPulse: true },
  'CLS': { label: 'Closed', variant: 'neutral', showPulse: false },
  'SUS': { label: 'Suspended', variant: 'danger', showPulse: false },
  'PRE': { label: 'Pre-market', variant: 'neutral', showPulse: false },
} as const;

/**
 * Get market state display info
 * @param marketState Market state code from PSX API
 * @returns Market state display properties
 */
export function getMarketStateInfo(marketState?: string): MarketStateInfo {
  if (!marketState) {
    return MARKET_STATE_MAP.OPN;
  }
  return MARKET_STATE_MAP[marketState as MarketState] || MARKET_STATE_MAP.OPN;
}

// ============================================================================
// SECTOR CONFIGURATION
// ============================================================================

/**
 * Priority sectors for PSX
 * Commonly watched sectors appear first in filters and displays
 */
export const PRIORITY_SECTORS = [
  'COMMERCIAL BANKS',
  'OIL & GAS EXPLORATION COMPANIES',
  'OIL & GAS MARKETING COMPANIES',
  'CEMENT',
  'FERTILIZER',
  'POWER GENERATION & DISTRIBUTION',
  'PHARMACEUTICALS',
  'TEXTILE COMPOSITE',
  'AUTOMOBILE ASSEMBLER',
  'TECHNOLOGY & COMMUNICATION',
] as const;

/**
 * Sort sectors by priority
 * @param sectors Array of sector names
 * @returns Sorted array with priority sectors first, then alphabetically
 */
export function sortSectorsByPriority(sectors: string[]): string[] {
  return [...sectors].sort((a, b) => {
    const aIndex = PRIORITY_SECTORS.findIndex(p => p === a);
    const bIndex = PRIORITY_SECTORS.findIndex(p => p === b);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
}

// ============================================================================
// NUMBER FORMATTING UTILITIES
// ============================================================================

/**
 * Number formatting thresholds
 */
export const FORMAT_THRESHOLDS = {
  BILLION: 1_000_000_000,
  MILLION: 1_000_000,
  THOUSAND: 1_000,
} as const;

/**
 * Currency configuration
 */
export const CURRENCY = {
  CODE: 'PKR',
  SYMBOL: '₨',
  LOCALE: 'en-PK',
} as const;

/**
 * Format a number with specified decimals and locale
 * @param num Number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted number string or 'N/A' if invalid
 * 
 * @example
 * formatNumber(1234.56) // "1,234.56"
 * formatNumber(1234.567, 3) // "1,234.567"
 * formatNumber(null) // "N/A"
 */
export function formatNumber(
  num: number | null | undefined,
  decimals: number = 2
): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return num.toLocaleString(CURRENCY.LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a large number with K/M/B suffixes
 * @param num Number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted number with suffix or 'N/A' if invalid
 * 
 * @example
 * formatVolume(1500000) // "1.50M"
 * formatVolume(2500000000) // "2.50B"
 * formatVolume(5400) // "5.40K"
 * formatVolume(500) // "500"
 */
export function formatVolume(
  num: number | null | undefined,
  decimals: number = 2
): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';

  if (num >= FORMAT_THRESHOLDS.BILLION) {
    return `${(num / FORMAT_THRESHOLDS.BILLION).toFixed(decimals)}B`;
  }
  if (num >= FORMAT_THRESHOLDS.MILLION) {
    return `${(num / FORMAT_THRESHOLDS.MILLION).toFixed(decimals)}M`;
  }
  if (num >= FORMAT_THRESHOLDS.THOUSAND) {
    return `${(num / FORMAT_THRESHOLDS.THOUSAND).toFixed(decimals)}K`;
  }
  return num.toFixed(decimals);
}

/**
 * Format a percentage value
 * @param num Number to format as percentage
 * @param decimals Number of decimal places (default: 2)
 * @param showSign Show + sign for positive values (default: true)
 * @returns Formatted percentage string or 'N/A' if invalid
 * 
 * @example
 * formatPercent(5.25) // "+5.25%"
 * formatPercent(-3.14) // "-3.14%"
 * formatPercent(5.25, 2, false) // "5.25%"
 */
export function formatPercent(
  num: number | null | undefined,
  decimals: number = 2,
  showSign: boolean = true
): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  const formatted = num.toFixed(decimals);
  if (showSign && num >= 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
}

/**
 * Format currency value with PKR symbol
 * @param num Number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted currency string or 'N/A' if invalid
 * 
 * @example
 * formatCurrency(1234.56) // "₨1,234.56"
 * formatCurrency(1000000) // "₨1,000,000.00"
 */
export function formatCurrency(
  num: number | null | undefined,
  decimals: number = 2
): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return `${CURRENCY.SYMBOL}${formatNumber(num, decimals)}`;
}

/**
 * Format market cap with appropriate suffix
 * @param num Market cap value
 * @returns Formatted market cap string or 'N/A' if invalid
 * 
 * @example
 * formatMarketCap(5000000000) // "₨5.00B"
 * formatMarketCap(250000000) // "₨250.00M"
 */
export function formatMarketCap(num: number | null | undefined): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return `${CURRENCY.SYMBOL}${formatVolume(num)}`;
}

/**
 * Abbreviate a large number for compact display
 * @param num Number to abbreviate
 * @param decimals Number of decimal places (default: 1)
 * @returns Abbreviated number string
 * 
 * @example
 * abbreviateNumber(1234567) // "1.2M"
 * abbreviateNumber(12345) // "12.3K"
 */
export function abbreviateNumber(
  num: number | null | undefined,
  decimals: number = 1
): string {
  return formatVolume(num, decimals);
}

// ============================================================================
// TIME RANGE CONFIGURATION
// ============================================================================

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'YTD' | 'Max';

export interface TimeRangeConfig {
  label: string;
  days: number;
  apiTimeframe: string;
}

/**
 * Time range configuration for charts
 */
export const TIME_RANGES: Record<TimeRange, TimeRangeConfig> = {
  '1D': { label: '1 Day', days: 1, apiTimeframe: '1h' },
  '1W': { label: '1 Week', days: 7, apiTimeframe: '1h' },
  '1M': { label: '1 Month', days: 30, apiTimeframe: '1d' },
  '3M': { label: '3 Months', days: 90, apiTimeframe: '1d' },
  '6M': { label: '6 Months', days: 180, apiTimeframe: '1d' },
  '1Y': { label: '1 Year', days: 365, apiTimeframe: '1d' },
  '5Y': { label: '5 Years', days: 1825, apiTimeframe: '1d' },
  'YTD': { label: 'YTD', days: -1, apiTimeframe: '1d' }, // Calculated dynamically
  'Max': { label: 'Max', days: -1, apiTimeframe: '1d' }, // All available data
} as const;

// ============================================================================
// API CONSTANTS
// ============================================================================

/**
 * PSX Terminal API base URL
 */
export const PSX_API_BASE_URL = 'https://psxterminal.com';

/**
 * API rate limits
 */
export const API_RATE_LIMITS = {
  REST_REQUESTS_PER_MINUTE: 100,
  WEBSOCKET_MAX_CONNECTIONS: 5,
  WEBSOCKET_MAX_SUBSCRIPTIONS: 20,
} as const;

/**
 * Timeframe options for kline data
 */
export const KLINE_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
export type KlineTimeframe = typeof KLINE_TIMEFRAMES[number];

/**
 * Market types
 */
export const MARKET_TYPES = {
  REGULAR: 'REG',
  FUTURES: 'FUT',
  INDICES: 'IDX',
  ODD_LOT: 'ODL',
  BILLS_AND_BONDS: 'BNB',
} as const;

// ============================================================================
// PERFORMANCE COLOR UTILITIES
// ============================================================================

/**
 * Get Tailwind color class based on performance value
 * @param value Performance value (positive or negative)
 * @returns Tailwind color class string
 * 
 * @example
 * getPerformanceColor(5.25) // "text-emerald-600 dark:text-emerald-400"
 * getPerformanceColor(-3.14) // "text-rose-600 dark:text-rose-400"
 * getPerformanceColor(0) // "text-slate-600 dark:text-slate-400"
 */
export function getPerformanceColor(value: number | null | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'text-slate-600 dark:text-slate-400';
  }
  if (value > 0) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (value < 0) {
    return 'text-rose-600 dark:text-rose-400';
  }
  return 'text-slate-600 dark:text-slate-400';
}

/**
 * Get background color class based on performance value
 * @param value Performance value
 * @returns Tailwind background color class
 */
export function getPerformanceBgColor(value: number | null | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'bg-slate-100 dark:bg-slate-800';
  }
  if (value > 0) {
    return 'bg-emerald-50 dark:bg-emerald-900/20';
  }
  if (value < 0) {
    return 'bg-rose-50 dark:bg-rose-900/20';
  }
  return 'bg-slate-100 dark:bg-slate-800';
}

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

/**
 * Format timestamp to readable date
 * @param timestamp Unix timestamp or Date object
 * @param includeTime Include time in output (default: false)
 * @returns Formatted date string
 * 
 * @example
 * formatDate(1732723200000) // "Nov 27, 2025"
 * formatDate(1732723200000, true) // "Nov 27, 2025, 2:00 PM"
 */
export function formatDate(
  timestamp: number | Date | string,
  includeTime: boolean = false
): string {
  const date = typeof timestamp === 'number' || typeof timestamp === 'string'
    ? new Date(timestamp)
    : timestamp;

  if (isNaN(date.getTime())) return 'Invalid Date';

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }

  return date.toLocaleDateString('en-US', options);
}

/**
 * Format timestamp to time only
 * @param timestamp Unix timestamp or Date object
 * @returns Formatted time string
 * 
 * @example
 * formatTime(1732723200000) // "2:00 PM"
 */
export function formatTime(timestamp: number | Date | string): string {
  const date = typeof timestamp === 'number' || typeof timestamp === 'string'
    ? new Date(timestamp)
    : timestamp;

  if (isNaN(date.getTime())) return 'Invalid Time';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Check if a value is a valid number
 * @param value Value to check
 * @returns true if valid number, false otherwise
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Safe division with fallback
 * @param numerator Numerator
 * @param denominator Denominator
 * @param fallback Fallback value if division fails (default: 0)
 * @returns Division result or fallback
 */
export function safeDivide(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  fallback: number = 0
): number {
  if (!isValidNumber(numerator) || !isValidNumber(denominator) || denominator === 0) {
    return fallback;
  }
  return numerator / denominator;
}

/**
 * Calculate percentage change
 * @param current Current value
 * @param previous Previous value
 * @returns Percentage change or null if invalid
 * 
 * @example
 * calculatePercentChange(110, 100) // 10
 * calculatePercentChange(90, 100) // -10
 */
export function calculatePercentChange(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (!isValidNumber(current) || !isValidNumber(previous) || previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

// ============================================================================
// CAPITAL GAINS TAX (CGT) CONFIGURATION
// ============================================================================

/**
 * Capital Gains Tax rate for Pakistan Stock Exchange
 * Applied to realized gains from stock sales
 * As of 2024: 15% flat rate on capital gains
 */
export const CGT_RATE = 0.15; // 15%

/**
 * CGT exemption threshold (if any)
 * Set to 0 if no exemption applies
 * Update this if tax laws change
 */
export const CGT_EXEMPT_AMOUNT = 0;

/**
 * Calculate CGT amount on realized gains
 * @param gain Realized gain amount
 * @returns CGT amount (15% of gain, or 0 if gain is negative/exempt)
 * 
 * @example
 * calculateCGT(10000) // 1500 (15% of 10000)
 * calculateCGT(-5000) // 0 (no tax on losses)
 * calculateCGT(100) // 15 (15% of 100)
 */
export function calculateCGT(gain: number | null | undefined): number {
  if (!isValidNumber(gain) || gain <= CGT_EXEMPT_AMOUNT) {
    return 0;
  }
  return gain * CGT_RATE;
}

/**
 * Format CGT amount for display
 * @param cgt CGT amount
 * @returns Formatted string with CGT label
 * 
 * @example
 * formatCGT(1500) // "CGT (15%): Rs. 1,500"
 * formatCGT(0) // "CGT (15%): Rs. 0"
 */
export function formatCGT(cgt: number | null | undefined): string {
  if (!isValidNumber(cgt)) {
    return 'CGT (15%): N/A';
  }
  return `CGT (15%): Rs. ${formatNumber(cgt)}`;
}

/**
 * Calculate net profit after CGT
 * @param gain Realized gain
 * @returns Net profit after 15% CGT deduction
 * 
 * @example
 * calculateNetProfit(10000) // 8500 (10000 - 1500 CGT)
 * calculateNetProfit(-5000) // -5000 (no tax on losses)
 */
export function calculateNetProfit(gain: number | null | undefined): number {
  if (!isValidNumber(gain)) {
    return 0;
  }
  const cgt = calculateCGT(gain);
  return gain - cgt;
}

/**
 * Get holding period label for display
 * @param days Number of days held
 * @returns Label indicating short-term (<365 days) or long-term (≥365 days)
 * 
 * @example
 * getHoldingPeriodLabel(200) // "Short-term"
 * getHoldingPeriodLabel(400) // "Long-term"
 */
export function getHoldingPeriodLabel(days: number): string {
  return days < 365 ? 'Short-term' : 'Long-term';
}
