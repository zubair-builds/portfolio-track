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
  index: IndexData | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function KSE100Widget({ 
  index, 
  isLoading = false, 
  onRefresh,
  refreshing = false 
}: KSE100WidgetProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:p-4 min-h-[100px]">
        <div className="space-y-3">
          <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:p-4 min-h-[100px] flex items-center justify-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">No index data available</p>
      </div>
    );
  }

  const stateInfo = getMarketStateInfo(index.marketState);
  const isPositive = index.change >= 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:p-4 min-h-[100px]">
      <div className="flex items-start justify-between mb-2">
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
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700 flex-shrink-0"
            title="Refresh"
          >
            <svg 
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
          </button>
        )}
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

