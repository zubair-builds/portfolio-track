'use client';

import { Badge } from './ui/Badge';
import { getMarketStateInfo } from '@/lib/constants';

interface IndexData {
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  trades: number;
  timestamp: Date;
  marketState?: string;
}

interface KSE100WidgetProps {
  index?: IndexData;
  isLoading?: boolean;
}

export default function KSE100Widget({
  index,
  isLoading = false,
}: KSE100WidgetProps) {
  if (isLoading) {
    return (
      <div className="h-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-4 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 w-8 bg-slate-100 dark:bg-slate-700 rounded animate-pulse mb-0.5" />
              <div className="h-4 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="h-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:p-4 flex items-center justify-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">No index data available</p>
      </div>
    );
  }

  const stateInfo = getMarketStateInfo(index.marketState);
  const isPositive = index.change >= 0;

  return (
    <div className="h-full bg-transparent p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {index.name}
            </h3>
            <Badge
              variant={stateInfo.variant}
              className="text-xs"
            >
              {stateInfo.showPulse && (
                <span className="relative inline-flex h-1.5 w-1.5 mr-1">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                </span>
              )}
              {stateInfo.label}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {index.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs sm:text-sm font-semibold tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isPositive ? '+' : ''}{index.change.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              {' '}
              ({isPositive ? '+' : ''}{(index.changePercent * 100).toFixed(2)}%)
            </span>
          </div>
        </div>
        {/* Refresh button removed from here */}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-slate-500 dark:text-slate-400 mb-0.5">High</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {index.high.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 mb-0.5">Low</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {index.low.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 mb-0.5">Volume</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {(index.volume / 1_000_000).toFixed(1)}M
          </p>
        </div>
      </div>
    </div>
  );
}

