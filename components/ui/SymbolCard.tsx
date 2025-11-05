'use client';

import { formatVolume, formatPrice, formatChange, formatPercent, getPerformanceColorClass, formatNumber } from '../../lib/formatUtils';

export interface SymbolCardAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface AdditionalMetric {
  label: string;
  value: string | number;
  color?: string;
}

export interface SymbolCardProps {
  // Required core data
  symbol: string;
  currentPrice?: number | null;
  
  // Optional metadata
  name?: string;
  sectorName?: string;
  isETF?: boolean;
  isGEM?: boolean;
  
  // Optional price details
  priceChange?: number;
  priceChangePercent?: number;
  ldcp?: number; // Last Day Close Price
  high?: number;
  low?: number;
  volume?: number;
  trades?: number;
  
  // Portfolio-specific fields (optional)
  shares?: number;
  avgBuy?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  
  // Additional metrics (optional, for future use)
  additionalMetrics?: AdditionalMetric[];
  
  // Actions
  actions?: SymbolCardAction[];
  
  // Behavior
  onClick?: () => void;
  loading?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function SymbolCard({
  symbol,
  currentPrice,
  name,
  sectorName,
  isETF,
  isGEM,
  priceChange,
  priceChangePercent,
  ldcp,
  high,
  low,
  volume,
  trades,
  shares,
  avgBuy,
  gainLoss,
  gainLossPercent,
  additionalMetrics,
  actions,
  onClick,
  loading = false,
  variant = 'default',
}: SymbolCardProps) {
  const performanceColor = getPerformanceColorClass(priceChange || priceChangePercent);
  const hasChange = priceChange !== undefined || priceChangePercent !== undefined;

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="animate-pulse space-y-3">
          <div className="flex justify-between">
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-lg border border-slate-200 bg-white p-4 shadow-sm
        transition-all duration-200
        dark:border-slate-700 dark:bg-slate-900/60
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.01]' : 'hover:shadow-md'}
      `}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Row 1: Symbol | Current Price */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {symbol}
            </span>
            {isETF && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                ETF
              </span>
            )}
            {isGEM && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                GEM
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatPrice(currentPrice)}
            </p>
          </div>
        </div>

        {/* Row 2: Company Name | Change & Percent */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
            {name || '—'}
          </p>
          {hasChange && (
            <p className={`text-sm font-semibold whitespace-nowrap ${performanceColor}`}>
              {formatChange(priceChange)} ({formatPercent(priceChangePercent)})
            </p>
          )}
        </div>

        {/* Row 3: Sector Badge | LDCP */}
        <div className="flex items-center justify-between gap-3">
          {sectorName && (
            <span className="inline-block px-2 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
              {sectorName}
            </span>
          )}
          {ldcp !== undefined && ldcp !== null && (
            <p className="text-xs text-slate-500 dark:text-slate-500 whitespace-nowrap">
              LDCP: {formatPrice(ldcp)}
            </p>
          )}
        </div>

        {/* Row 4: High • Low */}
        {(high !== undefined || low !== undefined) && (
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
            {high !== undefined && high !== null && (
              <span>H: {formatPrice(high)}</span>
            )}
            {low !== undefined && low !== null && (
              <span>L: {formatPrice(low)}</span>
            )}
          </div>
        )}

        {/* Row 5: Volume • Trades | Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {volume !== undefined && volume !== null && (
              <span>Vol: {formatVolume(volume)}</span>
            )}
            {trades !== undefined && trades !== null && (
              <span>Trades: {formatNumber(trades)}</span>
            )}
          </div>
          
          {actions && actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((action, index) => {
                const buttonColor = 
                  action.variant === 'danger' 
                    ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30'
                    : action.variant === 'primary'
                    ? 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800';

                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                    className={`p-2 rounded-lg transition ${buttonColor}`}
                    title={action.label}
                  >
                    {action.icon}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Portfolio-specific row */}
        {(shares !== undefined || avgBuy !== undefined || gainLoss !== undefined) && (
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            {shares !== undefined && (
              <span>Shares: {formatNumber(shares)}</span>
            )}
            {avgBuy !== undefined && (
              <span>Avg Buy: {formatPrice(avgBuy)}</span>
            )}
            {gainLoss !== undefined && gainLossPercent !== undefined && (
              <span className={getPerformanceColorClass(gainLoss)}>
                P/L: {formatChange(gainLoss)} ({formatPercent(gainLossPercent)})
              </span>
            )}
          </div>
        )}

        {/* Additional metrics row */}
        {additionalMetrics && additionalMetrics.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            {additionalMetrics.map((metric, index) => (
              <span key={index} className={metric.color || ''}>
                {metric.label}: {metric.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


