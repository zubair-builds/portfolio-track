'use client';

import { SectionTitle } from '../ui/SectionTitle';
import { Button } from '../ui/Button';
import Watchlist from '../Watchlist';
import { WatchlistItem, StockDetails } from '../../lib/portfolioData';

type WatchlistStock = WatchlistItem & {
  currentPrice: number | null;
  details?: StockDetails;
};

interface WatchlistTabProps {
  watchlist: WatchlistStock[];
  isLoading: boolean;
  onDeleteItem: (item: WatchlistItem) => void;
  onAddWatchlist: () => void;
}

export default function WatchlistTab({
  watchlist,
  isLoading,
  onDeleteItem,
  onAddWatchlist,
}: WatchlistTabProps) {

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle
            title="Watchlist"
            description="Symbols you're monitoring for potential entries"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12 18 19.5 12 19.5 1.5 12 1.5 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
          <Button
            onClick={onAddWatchlist}
            variant="primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Symbol
          </Button>
        </div>

        <Watchlist
          items={watchlist}
          isLoading={isLoading}
          onDeleteItem={onDeleteItem}
        />
      </section>
    </div>
  );
}

