'use client';

import { useState, useMemo } from 'react';
import { useDividendHistory } from '../hooks/useDividendHistory';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface DividendHistoryProps {
  symbol: string;
  currentPrice?: number;
}

export function DividendHistory({ symbol, currentPrice }: DividendHistoryProps) {
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const { dividends, summary, loading, error, refreshing, refresh } = useDividendHistory(
    symbol,
    { year: selectedYear, limit: selectedYear ? undefined : 10 }
  );

  // Calculate dividend yield if current price is available
  const dividendYield = useMemo(() => {
    if (!currentPrice || !summary?.lastDividend?.amount) return null;
    return (summary.lastDividend.amount / currentPrice) * 100;
  }, [currentPrice, summary]);

  const availableYears = Array.from(
    new Set(dividends.map(d => new Date(d.exDate).getFullYear()))
  ).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button onClick={refresh} disabled={refreshing} variant="primary">
          {refreshing ? 'Refreshing...' : 'Try Again'}
        </Button>
      </div>
    );
  }

  if (!dividends || dividends.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          No dividend history available for {symbol}
        </p>
        <Button onClick={refresh} disabled={refreshing} variant="primary">
          {refreshing ? 'Fetching...' : 'Fetch Dividend History'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Dividend History
        </h3>
        <Button
          onClick={refresh}
          disabled={refreshing}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Dividends</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              Rs. {summary.totalDividends.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Count</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              {summary.dividendCount}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Average</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              Rs. {summary.avgDividend.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Last Amount</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              Rs. {summary.lastDividend?.amount.toFixed(2) || 'N/A'}
            </p>
          </div>

          {dividendYield !== null && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 p-3">
              <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">Dividend Yield</p>
              <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100 font-mono">
                {dividendYield.toFixed(2)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Year Filter - More Prominent */}
      {availableYears.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter by year:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setSelectedYear(undefined)}
              variant={selectedYear === undefined ? 'primary' : 'secondary'}
              className="text-xs px-3 py-1.5"
            >
              All
            </Button>
            {availableYears.map(year => (
              <Button
                key={year}
                onClick={() => setSelectedYear(year)}
                variant={selectedYear === year ? 'primary' : 'secondary'}
                className="text-xs px-3 py-1.5"
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Dividend Table with Sticky Header */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Ex-Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {dividends.map((dividend, index) => {
                const exDate = new Date(dividend.exDate);
                const paymentDate = new Date(dividend.paymentDate);
                const today = new Date();
                const isPaid = paymentDate < today;
                const isUpcoming = exDate > today;

                return (
                  <tr
                    key={index}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100 font-mono">
                      {exDate.toLocaleDateString('en-PK', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100 font-mono">
                      {paymentDate.toLocaleDateString('en-PK', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-slate-900 dark:text-slate-100 font-mono">
                      Rs. {dividend.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="neutral" className="text-xs">
                        {dividend.year}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isUpcoming ? (
                        <Badge variant="live" className="text-xs font-medium">
                          Upcoming
                        </Badge>
                      ) : isPaid ? (
                        <Badge variant="success" className="text-xs font-medium">
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-xs font-medium">
                          Pending
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Annual Summary */}
      {selectedYear && (
        <div className="rounded-lg border border-slate-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Total {selectedYear} Dividends:{' '}
            <span className="text-lg">
              Rs. {dividends.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

