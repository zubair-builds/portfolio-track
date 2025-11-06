'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { useAuth } from './AuthProvider';

export default function CacheManager() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSymbols: 0,
    oldestCache: null as number | null,
    latestCache: null as number | null,
  });
  const [showManager, setShowManager] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (showManager) {
      updateStats();
    }
  }, [showManager]);

  const updateStats = async () => {
    try {
      const response = await fetch('/api/symbols/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    }
  };

  const handleRefreshPrices = async () => {
    if (!confirm('Fetch latest prices from PSX Terminal API? This may take a moment.')) {
      return;
    }

    setIsRefreshing(true);
    try {
      if (!user?.email) {
        alert('You must be signed in to refresh prices');
        return;
      }
      
      const response = await fetch('/api/symbols/refresh-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.email,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(`Successfully refreshed ${data.refreshed} of ${data.total} symbols! Refresh the page to see updated prices.`);
          updateStats();
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to refresh prices: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error refreshing prices:', error);
      alert('Failed to refresh prices. Please try again.');
    } finally {
      setIsRefreshing(false);
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
          title="Price Cache Manager"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <span className="text-sm font-medium">Prices</span>
        </button>
      ) : (
        <Card className="w-80 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Price Cache
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
                  Last Updated
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(stats.latestCache)}
                </p>
              </div>

              <button
                onClick={handleRefreshPrices}
                disabled={stats.totalSymbols === 0 || isRefreshing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefreshing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Prices
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Fetches latest data from PSX Terminal
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

