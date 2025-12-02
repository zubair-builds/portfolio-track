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
  positionId?: string; // Optional: for tracking individual positions
  positionCount?: number; // Optional: number of positions aggregated for this symbol
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
  totalDividendIncome?: number; // Net dividend income received
  grossDividendIncome?: number; // Before tax
  dividendTaxDeducted?: number; // Total WHT
  dividendYield?: number; // Dividend income as % of investment
  totalReturnWithDividends?: number; // Gain/Loss + Dividends
  totalReturnPercent?: number; // Total return as % of investment
}

export function calculatePortfolioStats(
  stocks: Stock[],
  dividendIncome: number = 0,
  dividendData?: {
    netDividend?: number;
    grossDividend?: number;
    taxDeducted?: number;
    zakatDeducted?: number;
  }
): PortfolioStats {
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

    const capitalGainLoss = currentValue - totalInvestment;
    const netDividendIncome = dividendData?.netDividend || dividendIncome || 0;
    const totalGainLoss = capitalGainLoss + netDividendIncome;
    const totalGainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;
    const dividendYield = totalInvestment > 0 ? (netDividendIncome / totalInvestment) * 100 : 0;

    return {
      totalInvestment,
      currentValue,
      totalGainLoss,
      totalGainLossPercent,
      topGainer,
      topLoser,
      totalDividendIncome: netDividendIncome,
      grossDividendIncome: dividendData?.grossDividend || 0,
      dividendTaxDeducted: dividendData?.taxDeducted || 0,
      dividendYield,
      totalReturnWithDividends: totalGainLoss,
      totalReturnPercent: totalGainLossPercent,
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

/**
 * Aggregate multiple positions for the same symbol
 * Combines shares and calculates weighted average buy price
 */
export function aggregatePositionsBySymbol(positions: Array<{
  _id?: string;
  symbol: string;
  shares: number;
  avgBuy: number;
  purchaseDate?: Date;
  currentPrice?: number;
  details?: StockDetails;
}>): Stock[] {
  console.log('[aggregatePositionsBySymbol] Input positions count:', positions.length);
  console.log('[aggregatePositionsBySymbol] Input symbols:', positions.map(p => p.symbol));
  
  const symbolMap = new Map<string, {
    positions: typeof positions;
    totalShares: number;
    weightedAvgBuy: number;
    earliestPurchaseDate?: Date;
    currentPrice?: number;
    details?: StockDetails;
  }>();

  // Group positions by symbol
  positions.forEach((position) => {
    const symbol = position.symbol.toUpperCase();
    const existing = symbolMap.get(symbol);

    if (existing) {
      existing.positions.push(position);
      existing.totalShares += position.shares;
      // Calculate weighted average: sum(shares * avgBuy) / sum(shares)
      const totalValue = existing.positions.reduce((sum, p) => sum + (p.shares * p.avgBuy), 0);
      existing.weightedAvgBuy = totalValue / existing.totalShares;
      
      // Use earliest purchase date
      if (position.purchaseDate) {
        const posDate = new Date(position.purchaseDate);
        if (!existing.earliestPurchaseDate || posDate < existing.earliestPurchaseDate) {
          existing.earliestPurchaseDate = posDate;
        }
      }
      
      // Use current price from any position (they should all be the same)
      if (position.currentPrice !== undefined) {
        existing.currentPrice = position.currentPrice;
      }
      
      // Use details from any position
      if (position.details && !existing.details) {
        existing.details = position.details;
      }
    } else {
      symbolMap.set(symbol, {
        positions: [position],
        totalShares: position.shares,
        weightedAvgBuy: position.avgBuy,
        earliestPurchaseDate: position.purchaseDate ? new Date(position.purchaseDate) : undefined,
        currentPrice: position.currentPrice,
        details: position.details,
      });
    }
  });

  // Convert map to array of aggregated Stock objects
  const result = Array.from(symbolMap.entries()).map(([symbol, aggregated]) => ({
    symbol,
    shares: aggregated.totalShares,
    avgBuy: aggregated.weightedAvgBuy,
    currentPrice: aggregated.currentPrice ?? 0,
    purchaseDate: aggregated.earliestPurchaseDate,
    details: aggregated.details,
    positionCount: aggregated.positions.length,
  }));
  
  console.log('[aggregatePositionsBySymbol] Output aggregated stocks count:', result.length);
  console.log('[aggregatePositionsBySymbol] Output symbols:', result.map(s => s.symbol));
  
  return result;
}

