'use client';

import { WatchlistItem, StockDetails } from '../lib/portfolioData';
import { Card, CardContent } from './ui/Card';
import SymbolCard from './ui/SymbolCard';
import { useSymbolMetadata } from '../hooks/useSymbolMetadata';

type WatchlistEntry = WatchlistItem & {
  currentPrice: number | null;
  details?: StockDetails;
};

interface WatchlistProps {
  items: WatchlistEntry[];
  isLoading: boolean;
  onEditItem?: (item: WatchlistEntry) => void;
  onDeleteItem?: (item: WatchlistEntry) => void;
}

export default function Watchlist({ items, isLoading, onEditItem, onDeleteItem }: WatchlistProps) {
  const symbols = items.map(item => item.symbol);
  const { metadata, loading: metadataLoading } = useSymbolMetadata(symbols);

  const hasLiveData = items.some((item) => item.currentPrice !== null || item.details);

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {isLoading ? (
          // Loading state - show skeleton cards
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              Loading watchlist...
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : items.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <svg className="h-16 w-16 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your watchlist is empty</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Track symbols you're interested in</p>
            </div>
          </div>
        ) : (
          // Items list
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const meta = metadata.get(item.symbol.toUpperCase());
              const details = item.details;

              // Prepare actions (only delete since watchlist items are now simple)
              const actions = [];
              if (onDeleteItem) {
                actions.push({
                  label: 'Remove',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ),
                  onClick: () => onDeleteItem(item),
                  variant: 'danger' as const,
                });
              }

              return (
                <SymbolCard
                  key={item.symbol}
                  symbol={item.symbol}
                  name={meta?.name || item.symbol}
                  sectorName={meta?.sectorName}
                  isETF={meta?.isETF}
                  isGEM={meta?.isGEM}
                  currentPrice={item.currentPrice}
                  priceChange={details?.change}
                  priceChangePercent={details?.changePercent ? details.changePercent * 100 : undefined}
                  ldcp={details?.low} // Using low as proxy for LDCP - update when we have actual LDCP field
                  high={details?.high}
                  low={details?.low}
                  volume={details?.volume}
                  trades={details?.trades}
                  actions={actions}
                  loading={metadataLoading && !meta}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
