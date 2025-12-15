'use client';

import { useMemo } from 'react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { MiniSparkline } from './MiniSparkline';

interface InvestmentPositionCardProps {
  shares: number;
  avgBuy: number;
  currentPrice: number;
  priceHistory?: Array<{ date: string; price: number }>;
  dividendYield?: number;
  lastDividend?: number;
  receivedDividend?: number; // Actual dividends received for this symbol
  receivedDividendGross?: number; // Gross dividend before tax
  receivedDividendTax?: number; // Tax deducted
}

export function InvestmentPositionCard({
  shares,
  avgBuy,
  currentPrice,
  priceHistory,
  dividendYield,
  lastDividend,
  receivedDividend,
  receivedDividendGross,
  receivedDividendTax,
}: InvestmentPositionCardProps) {
  const investment = shares * avgBuy;
  const currentValue = shares * currentPrice;
  const gainLoss = currentValue - investment;
  const gainLossPercent = ((currentPrice - avgBuy) / avgBuy) * 100;
  const isPositive = gainLoss >= 0;

  // Calculate total return including dividends
  const totalReturn = receivedDividend ? gainLoss + receivedDividend : gainLoss;
  const totalReturnPercent = receivedDividend
    ? ((totalReturn) / investment) * 100
    : gainLossPercent;
  const isTotalReturnPositive = totalReturn >= 0;

  // Extract prices for sparkline (last 30 days or available data)
  const sparklineData = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];
    const sorted = [...priceHistory]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 data points
    return sorted.map((d) => d.price);
  }, [priceHistory]);

  // Calculate annual dividend income if applicable
  const annualDividendIncome = useMemo(() => {
    if (lastDividend && shares) {
      return lastDividend * shares;
    }
    return null;
  }, [lastDividend, shares]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (num: number) => {
    const formatted = num.toFixed(2);
    return num >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  return (
    <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-slate-900">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              Your Investment Position
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Real-time position analysis
            </p>
          </div>
          <Badge variant="success" className="text-sm px-3 py-1.5">
            Owned
          </Badge>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Shares</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {shares.toLocaleString()}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Avg Buy Price</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              ₨{formatNumber(avgBuy)}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Invested</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              ₨{formatNumber(investment)}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Current Value</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              ₨{formatNumber(currentValue)}
            </p>
          </div>
        </div>

        {/* Performance Section with Sparkline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Gain/Loss</p>
              {sparklineData.length > 0 && (
                <MiniSparkline
                  data={sparklineData}
                  width={60}
                  height={20}
                  color={isPositive ? '#10b981' : '#ef4444'}
                />
              )}
            </div>
            <p
              className={`text-3xl font-bold font-mono ${isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                }`}
            >
              {isPositive ? '+' : ''}₨{formatNumber(gainLoss)}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Return %</p>
            <p
              className={`text-3xl font-bold font-mono ${gainLossPercent >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                }`}
            >
              {formatPercent(gainLossPercent)}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Current Price</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              ₨{formatNumber(currentPrice)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              vs Avg: {currentPrice >= avgBuy ? '+' : ''}
              {formatPercent(((currentPrice - avgBuy) / avgBuy) * 100)}
            </p>
          </div>
        </div>

        {/* Additional Info Row */}
        {(dividendYield !== undefined || annualDividendIncome !== null || receivedDividend) && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            {dividendYield !== undefined && dividendYield !== null && (
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Dividend Yield
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {dividendYield.toFixed(2)}%
                </p>
              </div>
            )}
            {annualDividendIncome !== null && (
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Est. Annual Dividend
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  ₨{formatNumber(annualDividendIncome)}
                </p>
              </div>
            )}
            {receivedDividend !== undefined && receivedDividend > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Received Dividends
                </p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  ₨{formatNumber(receivedDividend)}
                </p>
                {receivedDividendGross && receivedDividendGross > receivedDividend && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Gross: ₨{formatNumber(receivedDividendGross)}
                    {receivedDividendTax && ` (Tax: ₨${formatNumber(receivedDividendTax)})`}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Total Return with Dividends (if dividends received) */}
        {receivedDividend !== undefined && receivedDividend > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border-2 border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Total Return (incl. Dividends)
                </p>
                <Badge variant={isTotalReturnPositive ? 'success' : 'danger'} className="text-xs">
                  {isTotalReturnPositive ? '+' : ''}{formatPercent(totalReturnPercent)}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-bold font-mono ${isTotalReturnPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                  }`}>
                  {isTotalReturnPositive ? '+' : ''}₨{formatNumber(totalReturn)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  = Capital {isPositive ? 'Gain' : 'Loss'} + Dividends
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Capital {isPositive ? 'Gain' : 'Loss'}</p>
                  <p className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isPositive ? '+' : ''}₨{formatNumber(gainLoss)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Dividends</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    +₨{formatNumber(receivedDividend)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

