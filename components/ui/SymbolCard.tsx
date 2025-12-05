'use client';

import Link from 'next/link';
import { formatVolume, formatPrice, formatChange, formatPercent, getPerformanceColorClass, formatNumber } from '../../lib/formatUtils';
import { Badge } from './Badge';
import { getSortedIndices } from '@/lib/constants';

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
  isNonCompliant?: boolean;
  listedIn?: string;

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
  isNonCompliant,
  listedIn,
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
}: SymbolCardProps) {
  const performanceColor = getPerformanceColorClass(priceChange || priceChangePercent);
  const hasChange = priceChange !== undefined || priceChangePercent !== undefined;

  // Parse listedIn and sort by priority
  const indices = getSortedIndices(listedIn);

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
        relative overflow-hidden rounded-xl p-5 transition-all duration-300
        bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-800/80 dark:to-slate-900/40
        backdrop-blur-md border border-white/20 dark:border-slate-700/50
        ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : 'hover:shadow-md'}
      `}
      onClick={onClick}
    >
      {/* Decorative background circle */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* Row 1: Symbol | Current Price */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/symbol/${symbol}`}
              className="text-lg font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
              onClick={(e) => e.stopPropagation()}
              title="View price history"
            >
              {symbol}
            </Link>
            {isETF && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                ETF
              </span>
            )}
            {isGEM && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                GEM
              </span>
            )}
            {isNonCompliant !== undefined && (
              <span
                title={isNonCompliant ? 'Non-Shariah Compliant' : 'Shariah Compliant'}
                className="inline-flex items-center"
              >
                {isNonCompliant ? (
                  <svg className="w-4 h-4 text-rose-500 dark:text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            )}
            {indices.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {indices.slice(0, 2).map((index) => (
                  <Badge key={index} variant="neutral" className="text-xs">
                    {index}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
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
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 truncate max-w-[200px]">
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


