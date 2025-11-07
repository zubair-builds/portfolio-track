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

