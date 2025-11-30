'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import PriceChart from './PriceChart';

interface IndexDetails {
  symbol: string;
  name: string;
  description?: string;
  symbolCount?: number;
  symbols?: string[];
  updateFrequency?: string;
  latestPrice?: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    trades: number;
    value: number;
    high: number;
    low: number;
    timestamp: string;
    marketState?: string;
  };
  lastUpdated?: string;
}

interface IndexDetailsModalProps {
  symbol: string;
  onClose: () => void;
}

const formatNumber = (num: number | undefined | null, decimals = 2) => {
  if (num === undefined || num === null) return 'N/A';
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatValue = (num: number | undefined | null) => {
  if (num === undefined || num === null) return 'N/A';
  if (num >= 1_000_000_000) return `Rs. ${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `Rs. ${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `Rs. ${(num / 1_000).toFixed(2)}K`;
  return `Rs. ${num.toFixed(2)}`;
};

export default function IndexDetailsModal({ symbol, onClose }: IndexDetailsModalProps) {
  const [indexData, setIndexData] = useState<IndexDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'chart' | 'constituents'>('overview');

  const fetchIndexDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/indices/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setIndexData(data.index);
      } else {
        console.error('Failed to fetch index details');
      }
    } catch (error) {
      console.error('Error fetching index details:', error);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchIndexDetails();
  }, [fetchIndexDetails]);



  const isPositive = (indexData?.latestPrice?.change ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 p-6">
            <div>
              {loading ? (
                <Skeleton className="h-8 w-48 mb-2" />
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {indexData?.symbol.toUpperCase()}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {indexData?.name}
                  </p>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-8 h-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-700 px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('chart')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'chart'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
              >
                Chart
              </button>
              <button
                onClick={() => setActiveTab('constituents')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'constituents'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
              >
                Constituents ({indexData?.symbolCount || 0})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Price Stats */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                          Current Price
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Price</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                              {formatNumber(indexData?.latestPrice?.price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Change</p>
                            <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {isPositive ? '+' : ''}{formatNumber(indexData?.latestPrice?.change)}
                              <span className="text-sm ml-2">
                                ({isPositive ? '+' : ''}{formatNumber(indexData?.latestPrice?.changePercent)}%)
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">High</p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                              {formatNumber(indexData?.latestPrice?.high)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Low</p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                              {formatNumber(indexData?.latestPrice?.low)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Trading Stats */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                          Trading Activity
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Volume</p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                              {formatNumber(indexData?.latestPrice?.volume, 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Trades</p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                              {formatNumber(indexData?.latestPrice?.trades, 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Value</p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                              {formatValue(indexData?.latestPrice?.value)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Index Info */}
                    {indexData?.description && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                            About
                          </h3>
                          <p className="text-slate-700 dark:text-slate-300">
                            {indexData.description}
                          </p>
                          <div className="mt-4 flex gap-4">
                            <Badge variant="secondary">
                              {indexData.symbolCount || 0} Constituents
                            </Badge>
                            <Badge variant="secondary">
                              Update: {indexData.updateFrequency || 'N/A'}
                            </Badge>
                            {indexData.latestPrice?.marketState && (
                              <Badge variant={indexData.latestPrice.marketState === 'OPN' ? 'live' : 'secondary'}>
                                {indexData.latestPrice.marketState}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Chart Tab */}
                {activeTab === 'chart' && (
                  <div>
                    <PriceChart symbol={symbol} isIndex={true} />
                  </div>
                )}

                {/* Constituents Tab */}
                {activeTab === 'constituents' && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                        Index Constituents
                      </h3>
                      {indexData?.symbols && indexData.symbols.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {indexData.symbols.map((sym) => (
                            <Badge key={sym} variant="secondary" className="justify-center">
                              {sym}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400">
                          No constituents data available.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
