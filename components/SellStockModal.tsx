/**
 * SellStockModal Component
 * Modal for selling stocks with FIFO calculation preview
 */

'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { formatNumber, formatCurrency, formatCGT } from '@/lib/constants';


interface FIFOLotPreview {
  buyDate: Date;
  shares: number;
  buyPrice: number;
  holdingDays: number;
  gain: number;
  cgtAmount: number;
}

interface FIFOPreview {
  lotsUsed: FIFOLotPreview[];
  totalCost: number;
  totalProceeds: number;
  realizedGain: number;
  totalCGT: number;
  netProfit: number;
  holdingPeriodDays: number;
}

interface SellStockModalProps {
  onClose: () => void;
  symbol: string;
  availableShares: number;
  onSellComplete: () => void;
}

export default function SellStockModal({
  onClose,
  symbol: initialSymbol,
  availableShares,
  onSellComplete,
}: SellStockModalProps) {
  const [symbol] = useState(initialSymbol);
  const [shares, setShares] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [fifoPreview, setFifoPreview] = useState<FIFOPreview | null>(null);
  const [confirmUnderstanding, setConfirmUnderstanding] = useState(false);

  const maxShares = availableShares;

  // Auto-fetch current price when symbol changes
  useEffect(() => {
    if (symbol) {
      fetchCurrentPrice(symbol);
    }
  }, [symbol]);

  const fetchFIFOPreview = useCallback(async () => {
    setFetchingPreview(true);
    setError(null);

    try {
      const response = await fetch('/api/transactions/fifo-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          symbol,
          shares: parseFloat(shares),
          pricePerShare: parseFloat(pricePerShare),
          transactionDate: new Date(transactionDate),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFifoPreview(result.data);
      } else {
        setError(result.error || 'Failed to calculate FIFO preview');
        setFifoPreview(null);
      }
    } catch (error) {
      console.error('Error fetching FIFO preview:', error);
      setError('Failed to fetch FIFO preview');
      setFifoPreview(null);
    } finally {
      setFetchingPreview(false);
    }
  }, [symbol, shares, pricePerShare, transactionDate]);

  // Auto-fetch FIFO preview when shares or price changes
  useEffect(() => {
    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(pricePerShare);

    if (symbol && sharesNum > 0 && priceNum > 0) {
      fetchFIFOPreview();
    } else {
      setFifoPreview(null);
    }
  }, [symbol, shares, pricePerShare, transactionDate, fetchFIFOPreview]);

  const fetchCurrentPrice = async (sym: string) => {
    setFetchingPrice(true);
    try {
      const response = await fetch('/api/symbols/fetch-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.currentPrice) {
          setPricePerShare(result.data.currentPrice.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching price:', error);
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSharesChange = (value: string) => {
    setShares(value);
    const sharesNum = parseFloat(value);

    if (sharesNum > maxShares) {
      setError(`Cannot sell more than ${maxShares} shares`);
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(pricePerShare);

    if (!symbol) {
      setError('Please select a stock symbol');
      return;
    }

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError('Please enter a valid number of shares');
      return;
    }

    if (sharesNum > maxShares) {
      setError(`Cannot sell more than ${maxShares} shares`);
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (!transactionDate) {
      setError('Please select a transaction date');
      return;
    }

    if (!confirmUnderstanding) {
      setError('Please confirm you understand this will trigger CGT calculation');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol,
          transactionType: 'SELL',
          shares: sharesNum,
          pricePerShare: priceNum,
          transactionDate: new Date(transactionDate).toISOString(),
          notes: notes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to record sale');
      }

      // Call the completion callback to refresh portfolio
      onSellComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Sell Stock
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Record a stock sale with automatic FIFO gain calculation
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Symbol Display */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Stock Symbol
              </label>
              <div className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                <span className="font-semibold text-lg">{symbol}</span>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Available: {formatNumber(maxShares)} shares
                </p>
              </div>
            </div>

            {/* Shares */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Number of Shares *
                {maxShares > 0 && (
                  <span className="text-indigo-600 dark:text-indigo-400 ml-2">
                    (Max: {maxShares})
                  </span>
                )}
              </label>
              <input
                type="number"
                value={shares}
                onChange={(e) => handleSharesChange(e.target.value)}
                step="1"
                min="1"
                max={maxShares}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 100"
                required
              />
            </div>

            {/* Price Per Share */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Price Per Share *
                {fetchingPrice && (
                  <span className="text-sm text-slate-500 ml-2">Fetching current price...</span>
                )}
              </label>
              <input
                type="number"
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                step="0.01"
                min="0.01"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 125.50"
                required
              />
            </div>

            {/* Transaction Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Sale Date *
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Add any notes about this sale..."
              />
            </div>

            {/* FIFO Preview */}
            {fetchingPreview && (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2 dark:border-indigo-900 dark:border-t-indigo-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Calculating FIFO breakdown...</p>
              </div>
            )}

            {fifoPreview && !fetchingPreview && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  FIFO Calculation Preview
                </h3>

                {/* Lots Used Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Buy Date</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">Shares</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">Buy Price</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">Holding</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fifoPreview.lotsUsed.map((lot, idx) => (
                        <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                            {new Date(lot.buyDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(lot.shares)}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100">
                            {formatCurrency(lot.buyPrice)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Badge variant={lot.holdingDays >= 365 ? 'success' : 'secondary'}>
                              {lot.holdingDays} days
                            </Badge>
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${lot.gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                            {lot.gain >= 0 ? '+' : ''}{formatCurrency(lot.gain)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-indigo-200 dark:border-indigo-800">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Total Cost</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(fifoPreview.totalCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Total Proceeds</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(fifoPreview.totalProceeds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Realized Gain/Loss</p>
                    <p className={`text-lg font-semibold ${fifoPreview.realizedGain >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                      }`}>
                      {fifoPreview.realizedGain >= 0 ? '+' : ''}{formatCurrency(fifoPreview.realizedGain)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{formatCGT(0).split(':')[0]}</p>
                    <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      {formatCurrency(fifoPreview.totalCGT)}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-indigo-300 dark:border-indigo-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Net Profit (After CGT)</p>
                    <p className={`text-xl font-bold ${fifoPreview.netProfit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                      }`}>
                      {fifoPreview.netProfit >= 0 ? '+' : ''}{formatCurrency(fifoPreview.netProfit)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Checkbox */}
            {fifoPreview && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-cgt"
                  checked={confirmUnderstanding}
                  onChange={(e) => setConfirmUnderstanding(e.target.checked)}
                  className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="confirm-cgt" className="text-sm text-slate-700 dark:text-slate-300">
                  I understand this sale will trigger Capital Gains Tax (CGT) calculation at 15% and update my portfolio holdings.
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !symbol || !shares || !pricePerShare || !confirmUnderstanding}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Recording Sale...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Sale
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
