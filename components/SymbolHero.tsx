'use client';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface SymbolHeroProps {
  symbol: string;
  companyName?: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  volume?: number;
  marketCapString?: string;
  sectorName?: string;
  peRatio?: number;
  freeFloatString?: string;
  dividendYield?: number;
  isETF?: boolean;
  isGEM?: boolean;
  isDebt?: boolean;
  isNonCompliant?: boolean;
  listedIn?: string;
  // onRefresh removed
  // refreshing removed
  onToggleWatchlist?: () => void;
  isInWatchlist?: boolean;
  watchlistLoading?: boolean;
  lastUpdated?: string | Date;
}

export function SymbolHero({
  symbol,
  companyName,
  currentPrice,
  priceChange,
  priceChangePercent,
  volume,
  marketCapString,
  peRatio,
  dividendYield,
  sectorName,
  isETF,
  isGEM,
  isDebt,
  isNonCompliant,
  listedIn,
  // onRefresh removed
  // refreshing removed
  onToggleWatchlist,
  isInWatchlist = false,
  watchlistLoading = false,
  lastUpdated,
}: SymbolHeroProps) {
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (num: number | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    const formatted = num.toFixed(4);
    return num >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const formatVolume = (vol: number | undefined) => {
    if (vol === undefined || vol === null) return 'N/A';
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
    return vol.toLocaleString();
  };

  const isPositive = (priceChange || 0) >= 0;
  const isPositivePercent = (priceChangePercent || 0) >= 0;

  // Parse indices
  const indices = listedIn
    ? listedIn
      .split(',')
      .map((idx) => idx.trim())
      .filter(Boolean)
      .slice(0, 3) // Show max 3 indices
    : [];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {symbol}
              </h1>
              {sectorName && (
                <Badge variant="neutral" className="text-xs">
                  {sectorName}
                </Badge>
              )}
              {isETF && <Badge variant="neutral">ETF</Badge>}
              {isGEM && <Badge variant="neutral">GEM</Badge>}
              {isDebt && <Badge variant="neutral">Debt</Badge>}
              {isNonCompliant !== undefined && (
                <Badge variant={isNonCompliant ? 'danger' : 'success'}>
                  {isNonCompliant ? 'Non-Shariah' : 'Shariah Compliant'}
                </Badge>
              )}
              {indices.map((index) => (
                <Badge key={index} variant="neutral" className="text-xs">
                  {index}
                </Badge>
              ))}
            </div>
            {companyName && (
              <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                {companyName}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {onToggleWatchlist && (
              <Button
                onClick={onToggleWatchlist}
                disabled={watchlistLoading}
                variant="secondary"
                className="flex items-center gap-2"
              >
                {watchlistLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="hidden sm:inline">{isInWatchlist ? 'Removing...' : 'Adding...'}</span>
                  </>
                ) : (
                  <>
                    {isInWatchlist ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">In Watchlist</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="hidden sm:inline">Add to Watchlist</span>
                      </>
                    )}
                  </>
                )}
              </Button>
            )}
            {/* Refresh button removed from here */}
          </div>
        </div>

        {/* Price and Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Large Price Display */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Current Price</p>
              {lastUpdated && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {(() => {
                    const date = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
                  })()}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">

              <p className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                ₨{formatNumber(currentPrice)}
              </p>
              <p
                className={`text-sm font-semibold font-mono ${isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                  }`}
              >
                {priceChange !== undefined ? (isPositive ? '+' : '') + formatNumber(priceChange) : 'N/A'}
              </p>
              <p
                className={`text-sm font-semibold font-mono ${isPositivePercent
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                  }`}
              >
                {priceChangePercent !== undefined ? formatPercent(priceChangePercent) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Volume */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Volume</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {formatVolume(volume)}
            </p>
          </div>

          {/* Market Cap */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Market Cap</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {marketCapString || 'N/A'}
            </p>
          </div>

          {/* P/E Ratio */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">P/E Ratio</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono">
              {peRatio !== undefined ? peRatio.toFixed(2) : 'N/A'}
            </p>
          </div>

          {/* Dividend Yield */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-">Dividend Yield</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-mono">
              {dividendYield !== undefined ? `${dividendYield.toFixed(2)}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

