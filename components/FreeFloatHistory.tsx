'use client';

import { useFreeFloatHistory } from '../hooks/useFreeFloatHistory';
import { Button } from './ui/Button';

interface FreeFloatHistoryProps {
  symbol: string;
}

export function FreeFloatHistory({ symbol }: FreeFloatHistoryProps) {
  const { history, loading, error, refresh } = useFreeFloatHistory(symbol, 20);

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
        <Button onClick={refresh} variant="primary">
          Try Again
        </Button>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          No free float history available for {symbol}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Free Float History
        </h3>
        <Button
          onClick={refresh}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
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
          Refresh
        </Button>
      </div>

      {/* History Table */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Total Shares
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Free Float
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Free Float %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {history.map((record, index) => {
                const date = new Date(record.date);
                const prevRecord = index > 0 ? history[index - 1] : null;
                const percentChange = prevRecord
                  ? record.freeFloatPercent - prevRecord.freeFloatPercent
                  : 0;

                return (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                      {date.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                      {(record.shares / 1_000_000).toFixed(1)}M
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                      {(record.freeFloat / 1_000_000).toFixed(1)}M
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-slate-900 dark:text-slate-100">
                          {record.freeFloatPercent.toFixed(2)}%
                        </span>
                        {index > 0 && percentChange !== 0 && (
                          <span
                            className={`text-xs ${
                              percentChange > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            ({percentChange > 0 ? '+' : ''}
                            {percentChange.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

