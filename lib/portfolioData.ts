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
  { symbol: 'AVN', shares: 401, avgBuy: 59.51, currentPrice: 44.8 },
  { symbol: 'DCR', shares: 500, avgBuy: 13.05, currentPrice: 31.9 },
  { symbol: 'EFERT', shares: 1540, avgBuy: 80.46, currentPrice: 207.45 },
  { symbol: 'EPCL', shares: 657, avgBuy: 76.98, currentPrice: 27.41 },
  { symbol: 'HUBC', shares: 832, avgBuy: 74.41, currentPrice: 217.9 },
  { symbol: 'ILP', shares: 124, avgBuy: 40.57, currentPrice: 81.05 },
  { symbol: 'KOHE', shares: 500, avgBuy: 40.1, currentPrice: 18.03 },
  { symbol: 'SYS', shares: 200, avgBuy: 69.64, currentPrice: 155.35 },
  { symbol: 'TREET', shares: 500, avgBuy: 23.02, currentPrice: 33.44 },
  { symbol: 'LUCK', shares: 101, avgBuy: 104.25, currentPrice: 455.4 },
  { symbol: 'MIIETF', shares: 500, avgBuy: 13.94, currentPrice: 16.42 },
  { symbol: 'MTL', shares: 22, avgBuy: 443.61, currentPrice: 498.99 },
  { symbol: 'MZNPETF', shares: 1000, avgBuy: 12.7, currentPrice: 19.63 },
  { symbol: 'MARI', shares: 40, avgBuy: 638.54, currentPrice: 702.5 },
  { symbol: 'MEBL', shares: 380, avgBuy: 118.95, currentPrice: 440 },
];

export const initialWatchlistData: WatchlistItem[] = [
  {
    symbol: 'IREIT',
    thesis: 'Real Estate Investment Trust (REIT) sector showing strong recovery potential. Focus on companies with high dividend yields and strong growth prospects.',
    targetPrice: 10,
  },
  {
    symbol: 'TPLRF1',
    thesis: 'Real Estate Investment Trust (REIT) sector showing strong recovery potential. Focus on companies with high dividend yields and strong growth prospects.',
    targetPrice: 11,
  }, 
  {
    symbol: 'MIIETF',
    thesis: 'ETF for the Mid and Small Cap Index',
    targetPrice: 11,
  },
  {
    symbol: 'MZNPETF',
    thesis: 'ETF for the Large Cap Index. Focus on companies with high dividend yields and strong growth prospects.',
    targetPrice: 19,
  },
];

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

