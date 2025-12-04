'use client';

import { useState, FormEvent } from 'react';
import SymbolSearchDropdown from './SymbolSearchDropdown';
import { SearchSymbol } from '../hooks/useSymbolSearch';
import { Modal } from './ui/Modal';

interface AddWatchlistModalProps {
  onClose: () => void;
  onSave: (item: { symbol: string; thesis?: string; targetPrice?: number; note?: string }) => Promise<void>;
}

export default function AddWatchlistModal({ onClose, onSave }: AddWatchlistModalProps) {
  const [symbol, setSymbol] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);

  const handleSymbolChange = async (newSymbol: string, metadata?: SearchSymbol) => {
    setSymbol(newSymbol);
    setFetchedPrice(null);
    setError(null);

    // If symbol has no price, fetch it automatically
    if (metadata && !metadata.currentPrice && newSymbol) {
      setFetchingPrice(true);
      try {
        console.log('===watchlist===fetching symbol:', newSymbol);
        const response = await fetch('/api/symbols/fetch-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: newSymbol }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.currentPrice) {
            setFetchedPrice(result.data.currentPrice);
            // Update metadata with fetched price
          }
        }
      } catch (err) {
        console.error('Failed to fetch price:', err);
        // Don't show error to user, price will be fetched on refresh
      } finally {
        setFetchingPrice(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!symbol.trim()) {
      setError('Symbol is required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        symbol: symbol.trim().toUpperCase(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to watchlist');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add to Watchlist"
      subtitle="Track a new stock"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-200 dark:border-rose-800/50 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <SymbolSearchDropdown
              value={symbol}
              onChange={handleSymbolChange}
              placeholder="Search by symbol, name, or sector..."
              disabled={saving}
              autoFocus={true}
              label="Symbol"
              required={true}
            />

            {/* Price Fetching Status */}
            {fetchingPrice && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Fetching latest price for {symbol}...
              </div>
            )}

            {fetchedPrice !== null && !fetchingPrice && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Latest price fetched: ₨{fetchedPrice.toFixed(2)}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add to Watchlist
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

