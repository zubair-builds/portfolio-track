'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProfessionalHeader from '@/components/ProfessionalHeader';
import IndicesHero from '@/components/IndicesHero';
import ConstituentsTable from '@/components/ConstituentsTable';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import TimeRangeSelector from '@/components/TimeRangeSelector';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/components/AuthProvider';
import { usePriceHistory } from '@/hooks/usePriceHistory';

interface IndexData {
  symbol: string;
  name: string;
  description?: string;
  symbolCount?: number;
  updateFrequency?: string;
  latestPrice?: {
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    volume: number;
    trades: number;
    value: number;
    marketState?: string;
    timestamp?: string;
  };
  constituents?: string[];
}

export default function IndexDetailPage() {
  const router = useRouter();
  const params = useParams();
  const symbol = params?.symbol as string;
  const { user, initializing, signout } = useAuth();

  const [indexData, setIndexData] = useState<IndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chart' | 'constituents'>('overview');

  // Use price history hook for advanced chart functionality
  const {
    data: chartData,
    ohlcData,
    loading: chartLoading,
    fetching: chartFetching,
    checking: chartChecking,
    error: chartError,
    hasData: hasChartData,
    selectedRange,
    setSelectedRange,
    applyCustomRange,
    stats: chartStats,
    dataRange,
    fetchAndStore,
  } = usePriceHistory(symbol, '1d');

  useEffect(() => {
    if (!user && !initializing) {
      router.replace('/signin');
    }
  }, [user, initializing, router]);

  useEffect(() => {
    if (!symbol) return;

    async function fetchIndexData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/indices/${symbol}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch index data');
        }

        if (data.index) {
          setIndexData(data.index);
          // Update page title
          document.title = `${data.index.symbol} | ${data.index.latestPrice?.price?.toFixed(2) || 'N/A'} | ${data.index.name}`;
        } else {
          throw new Error('Index data not found');
        }
      } catch (err: any) {
        console.error('Error fetching index data:', err);
        setError(err.message || 'Failed to load index data');
      } finally {
        setLoading(false);
      }
    }

    fetchIndexData();
  }, [symbol]);

  const handleSignOut = () => {
    signout();
    router.replace('/signin');
  };

  if (initializing || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <ProfessionalHeader user={user} onSignOut={handleSignOut} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !indexData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <ProfessionalHeader user={user} onSignOut={handleSignOut} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-8 text-center">
            <p className="text-red-600 dark:text-red-400 text-lg mb-4">
              {error || 'Index not found'}
            </p>
            <button
              onClick={() => router.push('/indices')}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              ← Back to Indices
            </button>
          </Card>
        </main>
      </div>
    );
  }

  const { latestPrice } = indexData;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <ProfessionalHeader user={user} onSignOut={handleSignOut} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <IndicesHero
          symbol={indexData.symbol}
          name={indexData.name}
          currentPrice={latestPrice?.price || 0}
          change={latestPrice?.change || 0}
          changePercent={latestPrice?.changePercent || 0}
          high={latestPrice?.high || 0}
          low={latestPrice?.low || 0}
          volume={latestPrice?.volume || 0}
          trades={latestPrice?.trades || 0}
          value={latestPrice?.value || 0}
          marketState={latestPrice?.marketState}
          lastUpdated={latestPrice?.timestamp}
        />

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex gap-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('chart')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'chart'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setActiveTab('constituents')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'constituents'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                Constituents ({indexData.constituents?.length || 0})
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Index Information */}
            {indexData.description && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  About {indexData.symbol}
                </h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                  {indexData.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  {indexData.symbolCount && (
                    <Badge variant="secondary">
                      {indexData.symbolCount} Constituents
                    </Badge>
                  )}
                  {indexData.updateFrequency && (
                    <Badge variant="secondary">
                      Updated {indexData.updateFrequency}
                    </Badge>
                  )}
                  {latestPrice?.marketState && (
                    <Badge variant={latestPrice.marketState === 'OPN' ? 'live' : 'secondary'}>
                      {latestPrice.marketState}
                    </Badge>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'chart' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">
              Price History
            </h2>

            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Historical Index Data
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {hasChartData
                      ? `Daily index values`
                      : 'Historical price data not yet loaded'
                    }
                  </p>
                </div>

                {(!hasChartData && (!chartChecking && !chartLoading && !chartFetching && !chartError)) && (
                  <Button
                    variant="primary"
                    onClick={fetchAndStore}
                    disabled={chartFetching}
                    className="flex items-center gap-2"
                  >
                    {chartFetching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Fetching Data...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Load Historical Data
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Show loading state */}
              {(chartChecking || chartLoading || chartFetching) && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4 dark:border-indigo-900 dark:border-t-indigo-400" />
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
                    {chartChecking
                      ? 'Loading Chart Data...'
                      : chartFetching && !hasChartData
                        ? 'Fetching Historical Data'
                        : 'Loading Chart...'
                    }
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {chartFetching && !hasChartData
                      ? 'This may take a moment...'
                      : 'Please wait...'
                    }
                  </p>
                </div>
              )}

              {/* Show error */}
              {chartError && !chartChecking && !chartLoading && !chartFetching && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium">Failed to load data</p>
                      <p className="text-sm mt-1">{chartError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Show no data message */}
              {!hasChartData && !chartChecking && !chartLoading && !chartFetching && !chartError && (
                <div className="py-12 text-center">
                  <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    No Chart Data Available
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Historical price data has not been loaded for this index yet.
                  </p>
                </div>
              )}

              {/* Show chart when data is loaded */}
              {hasChartData && !chartChecking && !chartLoading && !chartFetching && (
                <>
                  {/* Time Range Selector */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <TimeRangeSelector
                      selected={selectedRange}
                      onChange={setSelectedRange}
                      onCustomRangeApply={applyCustomRange}
                      dataRange={dataRange || undefined}
                      disabled={chartLoading}
                    />

                    {dataRange && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Data: {dataRange.oldest ? new Date(dataRange.oldest).toLocaleDateString() : 'N/A'}
                        {' '}-{' '}
                        {dataRange.newest ? new Date(dataRange.newest).toLocaleDateString() : 'N/A'}
                      </div>
                    )}
                  </div>

                  {/* Chart */}
                  <PriceHistoryChart
                    data={chartData}
                    ohlcData={ohlcData}
                    symbol={symbol}
                    range={selectedRange}
                    loading={chartLoading}
                  />

                  {/* Stats */}
                  {chartStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">High</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {chartStats.high?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Low</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {chartStats.low?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Avg Volume</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {chartStats.avgVolume ? chartStats.avgVolume.toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Change</p>
                        <p className={`text-lg font-semibold ${
                          (chartStats.change || 0) >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {chartStats.change !== undefined
                            ? `${chartStats.change >= 0 ? '+' : ''}${chartStats.change.toFixed(2)}%`
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'constituents' && (
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
              Index Constituents
            </h2>
            <ConstituentsTable
              constituents={indexData.constituents || []}
              indexSymbol={indexData.symbol}
            />
          </div>
        )}
      </main>
    </div>
  );
}
