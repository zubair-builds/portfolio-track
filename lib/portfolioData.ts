export interface StockDetails {
  change: number;
  changePercent: number;
  volume: number;
  trades: number;
  value: number;
  high: number;
  low: number;
  bid: number;
  ask: number;
  bidVol: number;
  askVol: number;
  lastUpdated: number;
}

export interface Stock {
  symbol: string;
  shares: number;
  avgBuy: number;
  currentPrice: number;
  purchaseDate?: Date;
  details?: StockDetails;
}

export interface WatchlistItem {
  symbol: string;
  thesis?: string;
  targetPrice?: number;
  note?: string;
}

export const initialPortfolioData: Stock[] = [
  { symbol: 'DCR', shares: 500, avgBuy: 13.05, currentPrice: 31.9 },
];

export const initialWatchlistData: WatchlistItem[] = [{ symbol: 'MZNPETF' }];

export interface PortfolioStats {
  totalInvestment: number;
  currentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  topGainer: { symbol: string; gainPercent: number } | null;
  topLoser: { symbol: string; lossPercent: number } | null;
}

export function calculatePortfolioStats(stocks: Stock[]): PortfolioStats {
  let totalInvestment = 0;
  let currentValue = 0;
  let topGainer = null;
  let topLoser = null;
  let maxGainPercent = -Infinity;
  let maxLossPercent = Infinity;

  stocks.forEach((stock) => {
    const investment = stock.shares * stock.avgBuy;
    const value = stock.shares * stock.currentPrice;
    const gainLossPercent = ((stock.currentPrice - stock.avgBuy) / stock.avgBuy) * 100;

    totalInvestment += investment;
    currentValue += value;

    if (gainLossPercent > maxGainPercent) {
      maxGainPercent = gainLossPercent;
      topGainer = { symbol: stock.symbol, gainPercent: gainLossPercent };
    }

    if (gainLossPercent < maxLossPercent) {
      maxLossPercent = gainLossPercent;
      topLoser = { symbol: stock.symbol, lossPercent: gainLossPercent };
    }
  });

  const totalGainLoss = currentValue - totalInvestment;
  const totalGainLossPercent = (totalGainLoss / totalInvestment) * 100;

  return {
    totalInvestment,
    currentValue,
    totalGainLoss,
    totalGainLossPercent,
    topGainer,
    topLoser,
  };
}

/**
 * Calculate days held from purchase date
 */
export function calculateDaysHeld(purchaseDate?: Date): number | null {
  if (!purchaseDate) return null;
  const now = new Date();
  const purchase = new Date(purchaseDate);
  const diffTime = now.getTime() - purchase.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculate annualized return percentage
 * Formula: ((currentPrice / avgBuy) ^ (365 / daysHeld) - 1) * 100
 */
export function calculateAnnualizedReturn(
  avgBuy: number,
  currentPrice: number,
  daysHeld: number | null
): number | null {
  if (!daysHeld || daysHeld <= 0) return null;
  if (avgBuy <= 0) return null;
  
  const returnRatio = currentPrice / avgBuy;
  const yearsHeld = daysHeld / 365;
  
  if (yearsHeld <= 0) return null;
  
  const annualizedReturn = (Math.pow(returnRatio, 1 / yearsHeld) - 1) * 100;
  return annualizedReturn;
}

/**
 * Format purchase date for display
 */
export function formatPurchaseDate(purchaseDate?: Date): string {
  if (!purchaseDate) return 'N/A';
  const date = new Date(purchaseDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format days held for display
 */
export function formatDaysHeld(daysHeld: number | null): string {
  if (daysHeld === null) return 'N/A';
  if (daysHeld === 0) return 'Today';
  if (daysHeld === 1) return '1 day';
  return `${daysHeld} days`;
}

