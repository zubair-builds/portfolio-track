'use client';

import { useState, FormEvent } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Stock } from '../lib/portfolioData';

interface EditStockModalProps {
  stock: Stock;
  onClose: () => void;
  onSave: (stock: { symbol: string; shares: number; avgBuy: number; purchaseDate?: Date }) => Promise<void>;
}

export default function EditStockModal({ stock, onClose, onSave }: EditStockModalProps) {
  const [shares, setShares] = useState(stock.shares.toString());
  const [avgBuy, setAvgBuy] = useState(stock.avgBuy.toString());
  const [purchaseDate, setPurchaseDate] = useState(() => {
    // Format purchase date for date input (YYYY-MM-DD)
    if (stock.purchaseDate) {
      const date = new Date(stock.purchaseDate);
      return date.toISOString().split('T')[0];
    }
    // Default to today if no purchase date
    return new Date().toISOString().split('T')[0];
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const sharesNum = Number(shares);
    const avgBuyNum = Number(avgBuy);

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
        symbol: stock.symbol, 
        shares: sharesNum, 
        avgBuy: avgBuyNum,
        purchaseDate: purchaseDateObj
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update stock');
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Edit {stock.symbol}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Update your holding details
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

