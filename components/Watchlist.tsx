'use client';

import { WatchlistItem, StockDetails } from '../lib/portfolioData';
import { Card, CardContent } from './ui/Card';

type WatchlistEntry = WatchlistItem & {
  currentPrice: number | null;
  details?: StockDetails;
};

interface WatchlistProps {
  items: WatchlistEntry[];
  isLoading: boolean;
}

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function Watchlist({ items, isLoading }: WatchlistProps) {
  const hasLiveData = items.some((item) => item.currentPrice !== null || item.details);

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {isLoading && !hasLiveData && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            Refreshing watchlist prices...
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Add symbols to your watchlist to track them here.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const details = item.details;
              const hasDetails = Boolean(details);
              const isUp = details ? details.change >= 0 : false;
              const changeColor = hasDetails
                ? isUp
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400';

              return (
                <div
                  key={item.symbol}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {item.symbol}
                        </span>
                        {item.targetPrice && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                            Target ₨{item.targetPrice.toFixed(0)}
                          </span>
                        )}
                      </div>
                      {item.thesis && (
                        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                          {item.thesis}
                        </p>
                      )}
                      {item.note && (
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {item.note}
                        </p>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {item.currentPrice !== null ? `₨${item.currentPrice.toFixed(2)}` : '—'}
                      </p>
                      {hasDetails ? (
                        <p className={`text-sm font-semibold ${changeColor}`}>
                          {details!.change >= 0 ? '+' : ''}
                          {details!.change.toFixed(2)} ({(details!.changePercent * 100).toFixed(2)}%)
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Live price unavailable
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                    {hasDetails && (
                      <>
                        <span>Volume {details!.volume.toLocaleString()}</span>
                        <span>Trades {details!.trades.toLocaleString()}</span>
                        <span>High ₨{details!.high.toFixed(2)}</span>
                        <span>Low ₨{details!.low.toFixed(2)}</span>
                        {details!.lastUpdated && (
                          <span>Updated {formatTimestamp(details!.lastUpdated)}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

