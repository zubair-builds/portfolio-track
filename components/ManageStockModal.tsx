'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';

import { Stock } from '../lib/portfolioData';
import { useAuth } from './AuthProvider';
import { formatNumber, formatCurrency } from '@/lib/constants';
import { Modal } from './ui/Modal';

interface ManageStockModalProps {
  stock: Stock;
  onClose: () => void;
  onSave?: (stock: { symbol: string; shares: number; avgBuy: number; purchaseDate?: Date }) => Promise<void>;
  onDelete?: (stock: Stock) => void;
  onSellComplete?: () => void;
  onUpdated?: () => void;
}

interface FIFOLotPreview {
  buyDate: Date;
  shares: number;
  buyPrice: number;
  holdingDays: number;
  gain: number;
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

export default function ManageStockModal({ stock, onClose, onSave, onDelete, onSellComplete, onUpdated }: ManageStockModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'edit' | 'sell'>('edit');

  // Edit state
  const [shares, setShares] = useState(stock.shares.toString());
  const [avgBuy, setAvgBuy] = useState(stock.avgBuy.toString());
  const [purchaseDate, setPurchaseDate] = useState(() => {
    if (stock.purchaseDate) {
      const date = new Date(stock.purchaseDate);
      return date.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingStock, setDeletingStock] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sell state
  const [sellShares, setSellShares] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [sellError, setSellError] = useState<string | null>(null);
  const [savingSell, setSavingSell] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [fifoPreview, setFifoPreview] = useState<FIFOPreview | null>(null);

  const maxShares = stock.shares;

  // Auto-fetch current price when symbol changes
  useEffect(() => {
    if (stock.symbol) {
      fetchCurrentPrice(stock.symbol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock.symbol]);

  const fetchFIFOPreview = useCallback(async () => {
    setFetchingPreview(true);
    setSellError(null);

    try {
      const response = await fetch('/api/transactions/fifo-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          symbol: stock.symbol,
          shares: parseFloat(sellShares),
          pricePerShare: parseFloat(pricePerShare),
          transactionDate: new Date(transactionDate),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFifoPreview(result.data);
      } else {
        setSellError(result.error || 'Failed to calculate FIFO preview');
        setFifoPreview(null);
      }
    } catch (error) {
      console.error('Error fetching FIFO preview:', error);
      setSellError('Failed to fetch FIFO preview');
      setFifoPreview(null);
    } finally {
      setFetchingPreview(false);
    }
  }, [stock.symbol, sellShares, pricePerShare, transactionDate]);

  // Auto-fetch FIFO preview when shares or price changes
  useEffect(() => {
    const sharesNum = parseFloat(sellShares);
    const priceNum = parseFloat(pricePerShare);

    if (stock.symbol && sharesNum > 0 && priceNum > 0) {
      fetchFIFOPreview();
    } else {
      setFifoPreview(null);
    }
  }, [stock.symbol, sellShares, pricePerShare, transactionDate, fetchFIFOPreview]);

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

  // Edit submit
  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const sharesNum = Number(shares);
    const avgBuyNum = Number(avgBuy);

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setEditError('Shares must be a positive number');
      return;
    }

    if (isNaN(avgBuyNum) || avgBuyNum <= 0) {
      setEditError('Average buy price must be a positive number');
      return;
    }

    setSavingEdit(true);
    try {
      const purchaseDateObj = purchaseDate ? new Date(purchaseDate) : undefined;
      if (onSave) {
        await onSave({
          symbol: stock.symbol,
          shares: sharesNum,
          avgBuy: avgBuyNum,
          purchaseDate: purchaseDateObj,
        });
      } else {
        // Fallback to direct API call when onSave is not provided
        // Use PUT to update (consolidate) instead of POST (insert new)
        const res = await fetch('/api/portfolio', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.email ? { 'X-User-Id': user.email } : {}),
          },
          body: JSON.stringify({
            symbol: stock.symbol,
            shares: sharesNum,
            avgBuy: avgBuyNum,
            purchaseDate: purchaseDateObj?.toISOString(),
            mode: 'consolidate', // Flag to tell server to overwrite/consolidate
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to update stock');
        }
      }
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete handler
  const handleDeleteClick = async () => {
    if (!onDelete) return;

    setDeletingStock(true);
    try {
      await onDelete(stock);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Delete failed:', error);
      setShowDeleteConfirm(false);
    } finally {
      setDeletingStock(false);
    }
  };

  // Sell submit
  const handleSellSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSellError(null);

    const sharesNum = parseFloat(sellShares);
    const priceNum = parseFloat(pricePerShare);

    if (!stock.symbol) {
      setSellError('Please select a stock symbol');
      return;
    }

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setSellError('Please enter a valid number of shares');
      return;
    }

    if (sharesNum > maxShares) {
      setSellError(`Cannot sell more than ${maxShares} shares`);
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setSellError('Please enter a valid price');
      return;
    }

    if (!transactionDate) {
      setSellError('Please select a transaction date');
      return;
    }

    setSavingSell(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: stock.symbol,
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

      if (onSellComplete) onSellComplete();
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      setSellError(err instanceof Error ? err.message : 'Failed to record sale');
    } finally {
      setSavingSell(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={stock.symbol}
      subtitle="Edit your position or record a sale"
      headerContent={
        <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-2xl p-1">
          <button
            className={`flex-1 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === 'edit'
              ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-900/20'
              : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            onClick={() => setActiveTab('edit')}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Position
            </div>
          </button>
          <button
            className={`flex-1 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === 'sell'
              ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-900/20'
              : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            onClick={() => setActiveTab('sell')}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Record Sale
            </div>
          </button>
        </div>
      }
    >
      {activeTab === 'edit' && (
        <form onSubmit={handleEditSubmit} className="space-y-5">
          {editError && (
            <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-200 dark:border-rose-800/50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{editError}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="group">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Number of Shares</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  min="1"
                  step="1"
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  disabled={savingEdit}
                  placeholder="e.g., 1000"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Average Buy Price (₨)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">₨</span>
                <input
                  type="number"
                  required
                  value={avgBuy}
                  onChange={(e) => setAvgBuy(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 pl-10 pr-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  disabled={savingEdit}
                  placeholder="125.50"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                disabled={savingEdit}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            {onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={savingEdit || deletingStock}
                className="group px-5 py-2.5 rounded-xl font-semibold text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deletingStock ? (
                  <>
                    <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Holding
                  </>
                )}
              </button>
            )}
            <div className="ml-auto flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={savingEdit}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingEdit ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'sell' && (
        <form onSubmit={handleSellSubmit} className="space-y-5">
          {sellError && (
            <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-200 dark:border-rose-800/50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{sellError}</p>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Stock Symbol</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stock.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Available</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatNumber(maxShares)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">shares</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="group">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Number of Shares to Sell
                {maxShares > 0 && (
                  <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-normal">(Max: {formatNumber(maxShares)})</span>
                )}
              </label>
              <input
                type="number"
                value={sellShares}
                onChange={(e) => setSellShares(e.target.value)}
                step="1"
                min="1"
                max={maxShares}
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                placeholder="e.g., 100"
                required
              />
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Sale Price Per Share
                {fetchingPrice && (
                  <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400 animate-pulse">Fetching price...</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">₨</span>
                <input
                  type="number"
                  value={pricePerShare}
                  onChange={(e) => setPricePerShare(e.target.value)}
                  step="0.01"
                  min="0.01"
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 pl-10 pr-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="125.50"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Sale Date</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                required
              />
            </div>

          </div>

          {fetchingPreview && (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 p-8 text-center">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Calculating FIFO breakdown...</p>
            </div>
          )}

          {fifoPreview && !fetchingPreview && (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border-2 border-indigo-200 dark:border-indigo-800 p-6 space-y-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">FIFO Calculation</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">First-In, First-Out tax breakdown</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Buy Date</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Shares</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Buy Price</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Holding</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {fifoPreview.lotsUsed.map((lot, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">
                            {new Date(lot.buyDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100 font-medium">
                            {formatNumber(lot.shares)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                            {formatCurrency(lot.buyPrice)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${lot.holdingDays >= 365
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}>
                              {lot.holdingDays}d
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${lot.gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                            {lot.gain >= 0 ? '+' : ''}{formatCurrency(lot.gain)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Total Cost</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(fifoPreview.totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Proceeds</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(fifoPreview.totalProceeds)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {fifoPreview.realizedGain >= 0 ? 'Realized Gain' : 'Realized Loss'}
                      </span>
                      <span className={`font-bold ${fifoPreview.realizedGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {fifoPreview.realizedGain >= 0 ? '+' : ''}{formatCurrency(fifoPreview.realizedGain)}
                      </span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex flex-col justify-center ${fifoPreview.netProfit >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50'
                    }`}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={fifoPreview.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        CGT (15%)
                      </span>
                      <span className={fifoPreview.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        -{formatCurrency(fifoPreview.totalCGT)}
                      </span>
                    </div>
                    <div>
                      <span className={`block text-xs font-semibold uppercase tracking-wide mb-1 ${fifoPreview.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                        {fifoPreview.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                      </span>
                      <span className={`block text-2xl font-bold ${fifoPreview.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                        }`}>
                        {fifoPreview.netProfit >= 0 ? '+' : ''}{formatCurrency(fifoPreview.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {fifoPreview && (
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={savingSell}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingSell || !stock.symbol || !sellShares || !pricePerShare}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingSell ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Recording Sale...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Sale
                  </>
                )}
              </button>
            </div>
          )}

        </form>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-2xl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Delete {stock.symbol}?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This will remove {stock.shares.toLocaleString()} shares from your portfolio. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingStock}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={deletingStock}
                className="px-4 py-2 rounded-lg font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deletingStock ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
