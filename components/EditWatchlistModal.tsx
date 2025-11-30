'use client';

import { useState, FormEvent } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { WatchlistItem } from '../lib/portfolioData';

interface EditWatchlistModalProps {
  item: WatchlistItem;
  onClose: () => void;
  onSave: (item: { symbol: string; thesis?: string; targetPrice?: number; note?: string }) => Promise<void>;
}

export default function EditWatchlistModal({ item, onClose, onSave }: EditWatchlistModalProps) {
  const [thesis, setThesis] = useState(item.thesis || '');
  const [targetPrice, setTargetPrice] = useState(item.targetPrice?.toString() || '');
  const [note, setNote] = useState(item.note || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetPriceNum = targetPrice ? Number(targetPrice) : undefined;
    if (targetPrice && (isNaN(targetPriceNum!) || targetPriceNum! <= 0)) {
      setError('Target price must be a positive number');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        symbol: item.symbol,
        thesis: thesis.trim() || undefined,
        targetPrice: targetPriceNum,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update watchlist item');
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
        className="w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Edit {item.symbol}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Update your watchlist item
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="thesis" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Investment Thesis
              </label>
              <textarea
                id="thesis"
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder="Why are you watching this stock?"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="targetPrice" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Price (₨)
              </label>
              <input
                id="targetPrice"
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g., 10"
                min="0.01"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <input
                id="note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional notes..."
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

