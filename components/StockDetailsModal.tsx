'use client';

import { useEffect, useState } from 'react';
import type { Stock } from '../lib/portfolioData';
import { Card, CardContent } from './ui/Card';
import { CompanyInfo } from './CompanyInfo';
import { DividendHistory } from './DividendHistory';

interface StockDetailsModalProps {
  stock: Stock;
  onClose: () => void;
  onAnalyzeWithAI?: (stock: Stock) => void;
  onFetchSymbolData?: (stock: Stock) => void;
}

export default function StockDetailsModal({ stock, onClose, onAnalyzeWithAI, onFetchSymbolData }: StockDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'company' | 'dividends'>('overview');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const investment = stock.shares * stock.avgBuy;
  const currentValue = stock.shares * stock.currentPrice;
  const gainLoss = currentValue - investment;
  const gainLossPercent = ((stock.currentPrice - stock.avgBuy) / stock.avgBuy) * 100;
  const isPositive = gainLoss >= 0;

  const details = stock.details;
  const lastUpdatedLabel = details?.lastUpdated
    ? new Date(details.lastUpdated).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`${stock.symbol} details`}
    >
      <div className="w-full max-w-3xl">
        <Card className="shadow-2xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Stock Details
                </p>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {stock.symbol}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('company')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'company'
                    ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Company
              </button>
              <button
                onClick={() => setActiveTab('dividends')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'dividends'
                    ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Dividends
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Position Overview
                </h3>
                <dl className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex items-center justify-between">
                    <dt>Shares</dt>
                    <dd className="font-semibold">{stock.shares.toLocaleString()}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Average Buy</dt>
                    <dd className="font-semibold">₨{stock.avgBuy.toFixed(2)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Current Price</dt>
                    <dd className="font-semibold">₨{stock.currentPrice.toFixed(2)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Investment</dt>
                    <dd className="font-semibold">
                      ₨{investment.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Current Value</dt>
                    <dd className="font-semibold">
                      ₨{currentValue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Gain / Loss</dt>
                    <dd className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPositive ? '+' : ''}₨{gainLoss.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Gain / Loss %</dt>
                    <dd className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Market Data
                </h3>
                {details ? (
                  <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Change</dt>
                      <dd className={`font-semibold ${details.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {details.change >= 0 ? '+' : ''}{details.change.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Change %</dt>
                      <dd className={`font-semibold ${details.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {(details.changePercent * 100).toFixed(2)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Volume</dt>
                      <dd className="font-semibold">{details.volume.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Trades</dt>
                      <dd className="font-semibold">{details.trades.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Day High</dt>
                      <dd className="font-semibold">₨{details.high.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Day Low</dt>
                      <dd className="font-semibold">₨{details.low.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Bid</dt>
                      <dd className="font-semibold">₨{details.bid.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Ask</dt>
                      <dd className="font-semibold">₨{details.ask.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Bid Volume</dt>
                      <dd className="font-semibold">{details.bidVol.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Ask Volume</dt>
                      <dd className="font-semibold">{details.askVol.toLocaleString()}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Trade Value</dt>
                      <dd className="font-semibold">₨{details.value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
                    </div>
                    {lastUpdatedLabel && (
                      <div className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                        Last updated: {lastUpdatedLabel}
                      </div>
                    )}
                  </dl>
                ) : (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
                    <p className="font-medium">No live market data available.</p>
                    <p className="mt-1 text-xs opacity-80">
                      Clear the cache to refetch the latest information for this symbol.
                    </p>
                  </div>
                )}
              </div>
            </div>
              </>
            )}

            {/* Company Tab */}
            {activeTab === 'company' && (
              <div className="max-h-[60vh] overflow-y-auto">
                <CompanyInfo symbol={stock.symbol} />
              </div>
            )}

            {/* Dividends Tab */}
            {activeTab === 'dividends' && (
              <div className="max-h-[60vh] overflow-y-auto">
                <DividendHistory symbol={stock.symbol} />
              </div>
            )}

            <div className="flex justify-end gap-3">
              {onFetchSymbolData && activeTab === 'overview' && (
                <button
                  type="button"
                  onClick={() => {
                    onFetchSymbolData(stock);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  Fetch Symbol Data
                </button>
              )}
              {onAnalyzeWithAI && activeTab === 'overview' && (
                <button
                  type="button"
                  onClick={() => {
                    onAnalyzeWithAI(stock);
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Analyze with AI
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

