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
}

export function InvestmentPositionCard({
  shares,
  avgBuy,
  currentPrice,
  priceHistory,
  dividendYield,
  lastDividend,
}: InvestmentPositionCardProps) {
  const investment = shares * avgBuy;
  const currentValue = shares * currentPrice;
  const gainLoss = currentValue - investment;
  const gainLossPercent = ((currentPrice - avgBuy) / avgBuy) * 100;
  const isPositive = gainLoss >= 0;

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
                <MiniSparkline data={sparklineData} width={60} height={20} />
              )}
            </div>
            <p
              className={`text-3xl font-bold font-mono ${
                isPositive
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
              className={`text-3xl font-bold font-mono ${
                gainLossPercent >= 0
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
        {(dividendYield !== undefined || annualDividendIncome !== null) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            {dividendYield !== undefined && (
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

