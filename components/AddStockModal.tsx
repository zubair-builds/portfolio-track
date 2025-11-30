'use client';

import { useState, FormEvent } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import SymbolSearchDropdown from './SymbolSearchDropdown';
import { SearchSymbol } from '../hooks/useSymbolSearch';

interface AddStockModalProps {
  onClose: () => void;
  onSave: (stock: { symbol: string; shares: number; avgBuy: number; purchaseDate?: Date }) => Promise<void>;
}

export default function AddStockModal({ onClose, onSave }: AddStockModalProps) {
  const [symbol, setSymbol] = useState('');
  const [selectedMetadata, setSelectedMetadata] = useState<SearchSymbol | null>(null);
  const [shares, setShares] = useState('');
  const [avgBuy, setAvgBuy] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);

  const handleSymbolChange = async (newSymbol: string, metadata?: SearchSymbol) => {
    setSymbol(newSymbol);
    setSelectedMetadata(metadata || null);
    setFetchedPrice(null);
    setError(null);

    // If symbol has no price, fetch it automatically
    if (metadata && !metadata.currentPrice && newSymbol) {
      setFetchingPrice(true);
      try {
        console.log('=addstock=fetching symbol:', newSymbol);
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
            setSelectedMetadata({
              ...metadata,
              currentPrice: result.data.currentPrice,
            });
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

    const sharesNum = Number(shares);
    const avgBuyNum = Number(avgBuy);

    if (!symbol.trim()) {
      setError('Symbol is required');
      return;
    }

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError('Shares must be a positive number');
      return;
    }

    if (isNaN(avgBuyNum) || avgBuyNum <= 0) {
      setError('Average buy price must be a positive number');
      return;
    }

    setSaving(true);
    try {
      const purchaseDateObj = purchaseDate ? new Date(purchaseDate) : undefined;
      await onSave({
        symbol: symbol.trim().toUpperCase(),
        shares: sharesNum,
        avgBuy: avgBuyNum,
        purchaseDate: purchaseDateObj
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Add Stock to Portfolio
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Fetching latest price for {symbol}...
              </div>
            )}

            {fetchedPrice !== null && !fetchingPrice && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Latest price fetched: ₨{fetchedPrice.toFixed(2)}
              </div>
            )}

            <div>
              <label htmlFor="shares" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Number of Shares
              </label>
              <input
                id="shares"
                type="number"
                required
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="e.g., 100"
                min="1"
                step="1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="avgBuy" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Average Buy Price (₨)
              </label>
              <input
                id="avgBuy"
                type="number"
                required
                value={avgBuy}
                onChange={(e) => setAvgBuy(e.target.value)}
                placeholder="e.g., 80.46"
                min="0.01"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Purchase Date
              </label>
              <input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Adding...' : 'Add Stock'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

