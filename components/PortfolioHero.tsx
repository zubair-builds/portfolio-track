'use client';

import { useState } from 'react';

import { PortfolioStats } from '../lib/portfolioData';

interface PortfolioHeroProps {
  stats: PortfolioStats;
  totalStocks: number;
  isLoading?: boolean;
  benchmarkReturn?: number;
  benchmarkName?: string;
  lastUpdated?: Date;
  onUpdateCash?: (amount: number) => Promise<void>;
}

export default function PortfolioHero({
  stats,
  totalStocks,
  isLoading = false,
  lastUpdated,
  onUpdateCash
}: PortfolioHeroProps) {
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [editCashValue, setEditCashValue] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Main Hero Card Skeleton */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
          <div className="space-y-4">
            <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-16 w-64 bg-slate-800 rounded animate-pulse" />
              <div className="h-10 w-24 bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-6 w-40 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isPositive = stats.totalGainLoss >= 0;
  const gainLossColor = isPositive
    ? 'text-emerald-400'
    : 'text-rose-400';

  const handleSaveCash = async () => {
    if (!onUpdateCash) return;
    const amount = parseFloat(editCashValue);
    if (isNaN(amount) || amount < 0) return;

    await onUpdateCash(amount);
    setIsEditingCash(false);
  };

  const statCards = [
    {
      title: 'Invested Amount',
      value: `₨${stats.totalInvestment.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100',
      iconBg: 'bg-white/60 dark:bg-indigo-800/50',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
    },
    {
      title: 'Available Cash',
      value: isEditingCash ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={editCashValue}
            onChange={(e) => setEditCashValue(e.target.value)}
            className="w-full px-2 py-1 text-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Amount"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCash();
              if (e.key === 'Escape') setIsEditingCash(false);
            }}
          />
          <button
            onClick={handleSaveCash}
            className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => setIsEditingCash(false)}
            className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between group">
          <span>₨{(stats.availableCash || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          {onUpdateCash && (
            <button
              onClick={() => {
                setEditCashValue(stats.availableCash?.toString() || '0');
                setIsEditingCash(true);
              }}
              className="p-1 text-slate-400 hover:text-emerald-600 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
      ),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
      iconBg: 'bg-white/60 dark:bg-emerald-800/50',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      title: 'Current Positions',
      value: totalStocks.toString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100',
      iconBg: 'bg-white/60 dark:bg-violet-800/50',
      borderColor: 'border-violet-200 dark:border-violet-800',
    },
    {
      title: 'Dividends Collected',
      value: `₨${(stats.totalDividendIncome || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
      iconBg: 'bg-white/60 dark:bg-amber-800/50',
      borderColor: 'border-amber-200 dark:border-amber-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B0F19] border border-slate-800 p-8 shadow-2xl">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center gap-4">
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
                Total Portfolio Value
              </span>
              {lastUpdated && (
                <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
                  Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight tabular-nums">
              ₨{stats.currentValue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>

            <div className="flex items-center justify-center gap-3">
              <span className={`text-xl font-bold ${gainLossColor} tabular-nums flex items-center gap-1`}>
                {stats.totalGainLossPercent > 0 ? '+' : ''}{stats.totalGainLossPercent.toFixed(2)}%
              </span>
              <span className={`text-lg font-medium ${gainLossColor} tabular-nums opacity-80`}>
                ({stats.totalGainLoss > 0 ? '+' : ''}₨{stats.totalGainLoss.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border backdrop-blur-sm ${card.color} ${card.borderColor} bg-gradient-to-br from-white/50 to-white/10 dark:from-slate-800/50 dark:to-slate-900/10`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl ${card.iconBg}`}>
                  {card.icon}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">
                  {card.title}
                </p>
                <div className="text-2xl font-bold tracking-tight">
                  {card.value}
                </div>
              </div>
            </div>

            {/* Decorative background circle */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20 dark:bg-white/5 blur-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

