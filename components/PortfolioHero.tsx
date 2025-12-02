'use client';

import { PortfolioStats } from '../lib/portfolioData';
import TimeRangeIndicators from './TimeRangeIndicators';
import { MiniSparkline } from './MiniSparkline';
import ComparisonIndicator from './ComparisonIndicator';

interface PortfolioHeroProps {
  stats: PortfolioStats;
  totalStocks: number;
  isLoading?: boolean;
  benchmarkReturn?: number;
  benchmarkName?: string;
  sparklineData?: number[];
  lastUpdated?: Date;
}

export default function PortfolioHero({
  stats,
  totalStocks,
  isLoading = false,
  benchmarkReturn,
  benchmarkName = 'KSE-100',
  sparklineData,
  lastUpdated
}: PortfolioHeroProps) {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
        <div className="space-y-6">
          {/* Top Row Skeleton */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="h-10 sm:h-12 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="hidden sm:block h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="pt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-6 w-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                ))}
              </div>
            </div>
            <div className="lg:min-w-[280px] h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-4 h-[88px] border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isPositive = stats.totalGainLoss >= 0;
  const gainLossColor = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';

  // Generate sparkline data if not provided (simple trend based on current vs invested)
  const defaultSparklineData = sparklineData || (() => {
    const points = 20;
    const trend = stats.currentValue / stats.totalInvestment;
    return Array.from({ length: points }, (_, i) => {
      const progress = i / (points - 1);
      return stats.totalInvestment * (1 + (trend - 1) * progress);
    });
  })();

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
      <div className="space-y-6">
        {/* Top Row: Main Value and Benchmark Comparison */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          {/* Main Portfolio Value */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Portfolio Value
              </p>
              {lastUpdated && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                  ₨{stats.currentValue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="hidden sm:block">
                  <MiniSparkline
                    data={defaultSparklineData}
                    width={80}
                    height={32}
                    color={isPositive ? '#10b981' : '#ef4444'}
                  />
                </div>
              </div>
              <div className={`flex items-center gap-1 text-xl sm:text-2xl font-bold ${gainLossColor} tabular-nums`}>
                {isPositive ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
                {isPositive ? '+' : ''}{stats.totalGainLossPercent.toFixed(2)}%
              </div>
            </div>
            <p className={`text-base sm:text-lg font-semibold ${gainLossColor} tabular-nums`}>
              {isPositive ? '+' : ''}₨{stats.totalGainLoss.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>

            {/* Time-based Change Indicators */}
            <div className="pt-2">
              <TimeRangeIndicators isLoading={isLoading} />
            </div>
          </div>

          {/* Benchmark Comparison */}
          {benchmarkReturn !== undefined && (
            <div className="lg:min-w-[280px]">
              <ComparisonIndicator
                portfolioReturn={stats.totalGainLossPercent}
                benchmarkReturn={benchmarkReturn}
                benchmarkName={benchmarkName}
              />
            </div>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Investment */}
          <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-4 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Invested
              </p>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              ₨{stats.totalInvestment.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* ROI */}
          <div className={`bg-white/70 dark:bg-slate-800/70 rounded-lg p-4 backdrop-blur-sm border ${isPositive
            ? 'border-emerald-200/50 dark:border-emerald-800/30'
            : 'border-rose-200/50 dark:border-rose-800/30'
            } hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                ROI
              </p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPositive
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-rose-100 dark:bg-rose-900/30'
                }`}>
                {isPositive ? (
                  <svg className={`w-4 h-4 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
              </div>
            </div>
            <p className={`text-xl sm:text-2xl font-bold tabular-nums ${gainLossColor}`}> 
              {isPositive ? '+' : ''}{stats.totalGainLossPercent.toFixed(2)}%
            </p>
          </div>

          {/* Dividend Income */}
          {typeof stats.totalDividendIncome === 'number' && (
            <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-4 backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-800/30 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">
                  Dividends
                </p>
                <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-yellow-700 dark:text-yellow-300 tabular-nums">
                ₨{stats.totalDividendIncome.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Number of Positions */}
          <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-4 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Positions
              </p>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {totalStocks}
            </p>
          </div>

          {/* Top Performer */}
          {stats.topGainer ? (
            <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-4 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Top Performer
                </p>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                {stats.topGainer.symbol}
              </p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{stats.topGainer.gainPercent.toFixed(2)}%
              </p>
            </div>
          ) : (
            <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-4 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Top Performer
                </p>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No data
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

