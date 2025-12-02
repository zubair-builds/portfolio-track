'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { PortfolioStats } from '../lib/portfolioData';

interface EnhancedPortfolioSummaryProps {
  stats: PortfolioStats;
}

interface TransactionStats {
  totalRealizedGains: number;
  totalCGTPaid: number;
}

export default function EnhancedPortfolioSummary({ stats }: EnhancedPortfolioSummaryProps) {
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactionStats() {
      try {
        const response = await fetch('/api/transactions/stats');
        if (response.ok) {
          const data = await response.json();
          setTransactionStats({
            totalRealizedGains: data.totalRealizedGains || 0,
            totalCGTPaid: data.totalCGTPaid || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch transaction stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTransactionStats();
  }, []);

  const unrealizedGains = stats.totalGainLoss;
  const realizedGains = transactionStats?.totalRealizedGains || 0;
  const totalGains = unrealizedGains + realizedGains;

  const isUnrealizedPositive = unrealizedGains >= 0;
  const isRealizedPositive = realizedGains >= 0;
  const isTotalPositive = totalGains >= 0;

  const unrealizedColor = isUnrealizedPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
  const unrealizedBg = isUnrealizedPositive
    ? 'bg-emerald-50 dark:bg-emerald-900/20'
    : 'bg-rose-50 dark:bg-rose-900/20';

  const realizedColor = isRealizedPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
  const realizedBg = isRealizedPositive
    ? 'bg-emerald-50 dark:bg-emerald-900/20'
    : 'bg-rose-50 dark:bg-rose-900/20';

  const totalColor = isTotalPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
  const totalBg = isTotalPositive
    ? 'bg-emerald-50 dark:bg-emerald-900/20'
    : 'bg-rose-50 dark:bg-rose-900/20';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Investment */}
      <Card className="hover:shadow-lg transition-all duration-150">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
              Invested
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              ₨{stats.totalInvestment.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Value */}
      <Card className="hover:shadow-lg transition-all duration-150">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
              Current Value
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              ₨{stats.currentValue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dividend Income */}
      {typeof stats.totalDividendIncome === 'number' && (
        <Card className="hover:shadow-lg transition-all duration-150 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 uppercase tracking-wide mb-1">
                Income from Dividends
              </p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 tabular-nums">
                ₨{stats.totalDividendIncome.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {typeof stats.totalDividendTax === 'number' && (
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Tax Deducted: ₨{stats.totalDividendTax.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
              {typeof stats.totalDividendZakat === 'number' && (
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Zakat Deducted: ₨{stats.totalDividendZakat.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <Card className={`hover:shadow-lg transition-all duration-150 ${unrealizedBg}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUnrealizedPositive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
              Unrealized Gains
            </p>
            <p className={`text-2xl font-bold tabular-nums ${unrealizedColor}`}>
              {isUnrealizedPositive ? '+' : ''}₨{unrealizedGains.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-sm font-medium mt-1 tabular-nums ${unrealizedColor}`}>
              {isUnrealizedPositive ? '+' : ''}{stats.totalGainLossPercent.toFixed(2)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Realized Gains */}
      <Card className={`hover:shadow-lg transition-all duration-150 ${realizedBg}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isRealizedPositive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
              Realized Gains
            </p>
            {loading ? (
              <p className="text-2xl font-bold text-slate-400 dark:text-slate-600">...</p>
            ) : (
              <>
                <p className={`text-2xl font-bold tabular-nums ${realizedColor}`}>
                  {isRealizedPositive ? '+' : ''}₨{realizedGains.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {transactionStats && transactionStats.totalCGTPaid > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    CGT: ₨{transactionStats.totalCGTPaid.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Total Gains */}
      <Card className={`hover:shadow-lg transition-all duration-150 ${totalBg}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isTotalPositive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
              {isTotalPositive ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
              Total Gains
            </p>
            {loading ? (
              <p className="text-2xl font-bold text-slate-400 dark:text-slate-600">...</p>
            ) : (
              <>
                <p className={`text-2xl font-bold tabular-nums ${totalColor}`}>
                  {isTotalPositive ? '+' : ''}₨{totalGains.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Combined P&L
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Performer */}
      <Card className="hover:shadow-lg transition-all duration-150">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
              Top Performer
            </p>
            {stats.topGainer && (
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {stats.topGainer.symbol}
                </p>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{stats.topGainer.gainPercent.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
