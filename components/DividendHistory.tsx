'use client';

import { useState } from 'react';
import { useDividendHistory } from '../hooks/useDividendHistory';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface DividendHistoryProps {
  symbol: string;
}

export function DividendHistory({ symbol }: DividendHistoryProps) {
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const { dividends, summary, loading, error, refreshing, refresh } = useDividendHistory(
    symbol,
    { year: selectedYear, limit: selectedYear ? undefined : 10 }
  );

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Dividends</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Rs. {summary.totalDividends.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Count</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {summary.dividendCount}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Average</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Rs. {summary.avgDividend.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Last Amount</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Rs. {summary.lastDividend?.amount.toFixed(2) || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Year Filter */}
      {availableYears.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-600 dark:text-slate-400">Filter by year:</span>
          <Button
            onClick={() => setSelectedYear(undefined)}
            variant={selectedYear === undefined ? 'primary' : 'secondary'}
            className="text-sm"
          >
            All
          </Button>
          {availableYears.map(year => (
            <Button
              key={year}
              onClick={() => setSelectedYear(year)}
              variant={selectedYear === year ? 'primary' : 'secondary'}
              className="text-sm"
            >
              {year}
            </Button>
          ))}
        </div>
      )}

      {/* Dividend Table */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Ex-Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Payment Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Amount
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Year
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {dividends.map((dividend, index) => {
                const exDate = new Date(dividend.exDate);
                const paymentDate = new Date(dividend.paymentDate);
                const today = new Date();
                const isPaid = paymentDate < today;
                const isUpcoming = exDate > today;

                return (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                      {exDate.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                      {paymentDate.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-slate-900 dark:text-slate-100">
                      Rs. {dividend.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="neutral">{dividend.year}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isUpcoming ? (
                        <Badge variant="live">Upcoming</Badge>
                      ) : isPaid ? (
                        <Badge variant="success">Paid</Badge>
                      ) : (
                        <Badge variant="neutral">Pending</Badge>
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

