'use client';

import { useState, useEffect } from 'react';
import { getCacheStats, clearStockCache } from '../lib/stockApi';
import { Card, CardContent } from './ui/Card';

export default function CacheManager() {
  const [stats, setStats] = useState({
    totalSymbols: 0,
    oldestCache: null as number | null,
    latestCache: null as number | null,
  });
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    updateStats();
  }, []);

  const updateStats = () => {
    const cacheStats = getCacheStats();
    setStats(cacheStats);
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the cache? This will fetch fresh data from the API on next load.')) {
      clearStockCache();
      updateStats();
      alert('Cache cleared! Please refresh the page to fetch new data.');
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showManager ? (
        <button
          onClick={() => setShowManager(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-colors"
          title="Cache Manager"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <span className="text-sm font-medium">Cache</span>
        </button>
      ) : (
        <Card className="w-80 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Cache Manager
              </h3>
              <button
                onClick={() => setShowManager(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Cached Symbols
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.totalSymbols}
                  </p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Oldest Cache
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(stats.oldestCache)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Last Saved
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(stats.latestCache)}
                </p>
              </div>

              <button
                onClick={handleClearCache}
                disabled={stats.totalSymbols === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Cache
              </button>

              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Cache expires after 24 hours
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

