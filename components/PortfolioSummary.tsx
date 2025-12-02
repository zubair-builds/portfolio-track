'use client';

import { Card, CardContent } from './ui/Card';
import { PortfolioStats } from '../lib/portfolioData';

interface PortfolioSummaryProps {
  stats: PortfolioStats;
}

export default function PortfolioSummary({ stats }: PortfolioSummaryProps) {
  const isPositive = stats.totalGainLoss >= 0;
  const gainLossColor = isPositive 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : 'text-rose-600 dark:text-rose-400';
  const gainLossBg = isPositive 
    ? 'bg-emerald-50 dark:bg-emerald-900/20' 
    : 'bg-rose-50 dark:bg-rose-900/20';

  const hasDividends = typeof stats.totalDividendIncome === 'number' && stats.totalDividendIncome > 0;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${hasDividends ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
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
              Total Investment
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

      {/* Total Gain/Loss */}
      <Card className={`hover:shadow-lg transition-all duration-150 ${gainLossBg}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPositive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
              {isPositive ? (
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
              Total Gain/Loss
            </p>
            <p className={`text-2xl font-bold tabular-nums ${gainLossColor}`}>
              {isPositive ? '+' : ''}₨{stats.totalGainLoss.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-sm font-medium mt-1 tabular-nums ${gainLossColor}`}>
              {isPositive ? '+' : ''}{stats.totalGainLossPercent.toFixed(2)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
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

      {/* Dividend Income Card (conditional) */}
      {hasDividends && (
        <Card className="hover:shadow-lg transition-all duration-150 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                Dividend Income
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400 tabular-nums">
                ₨{stats.totalDividendIncome!.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {stats.dividendYield !== undefined && stats.dividendYield > 0 && (
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                  {stats.dividendYield.toFixed(2)}% yield
                </p>
              )}
              {stats.dividendTaxDeducted !== undefined && stats.dividendTaxDeducted > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tax: ₨{stats.dividendTaxDeducted.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
