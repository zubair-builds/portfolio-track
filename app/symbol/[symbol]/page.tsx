'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePriceHistory } from '../../../hooks/usePriceHistory';
import { useAuth } from '../../../components/AuthProvider';
import { usePortfolioData } from '../../../hooks/usePortfolioData';
import PriceHistoryChart from '../../../components/PriceHistoryChart';
import TimeRangeSelector from '../../../components/TimeRangeSelector';
import { CompanyInfo } from '../../../components/CompanyInfo';
import { DividendHistory } from '../../../components/DividendHistory';
import { FreeFloatHistory } from '../../../components/FreeFloatHistory';
import AIFinancialChatbot from '../../../components/AIFinancialChatbot';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

interface SymbolMetadata {
  symbol: string;
  name: string;
  sectorName?: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  isETF?: boolean;
  isGEM?: boolean;
  isDebt?: boolean;
  isNonCompliant?: boolean;
  listedIn?: string;
}

export default function SymbolDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.symbol.toUpperCase();
  const router = useRouter();
  const { user } = useAuth();
  const { stocks: portfolioStocks } = usePortfolioData(user?.email);
  
  const {
    data,
    loading,
    fetching,
    error,
    hasData,
    selectedRange,
    setSelectedRange,
    applyCustomRange,
    stats,
    dataRange,
    fetchAndStore,
  } = usePriceHistory(symbol, '1d');

  const [metadata, setMetadata] = useState<SymbolMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);

  // Check if user owns this stock
  const ownedStock = portfolioStocks.find(s => s.symbol.toUpperCase() === symbol);

  // Fetch symbol metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`/api/symbols/metadata?symbol=${symbol}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.metadata) {
            setMetadata(result.metadata);
          }
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchMetadata();
  }, [symbol]);

  const handleFetchData = async () => {
    try {
      await fetchAndStore();
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (num: number | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    const formatted = num.toFixed(2);
    return num >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/70">
        <div className="container mx-auto max-w-7xl flex items-center justify-between py-6 px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {symbol}
              </h1>
              {metadataLoading ? (
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {metadata?.name || 'Loading...'}
                </p>
              )}
            </div>
            {metadata?.sectorName && (
              <Badge variant="neutral">{metadata.sectorName}</Badge>
            )}
            {metadata?.isETF && (
              <Badge variant="neutral">ETF</Badge>
            )}
            {metadata?.isGEM && (
              <Badge variant="neutral">GEM</Badge>
            )}
            {metadata?.isDebt && (
              <Badge variant="neutral">Debt</Badge>
            )}
            {metadata?.isNonCompliant !== undefined && (
              <Badge variant={metadata.isNonCompliant ? "danger" : "success"}>
                {metadata.isNonCompliant ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Non-Shariah
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Shariah Compliant
                  </span>
                )}
              </Badge>
            )}
            {metadata?.listedIn && (() => {
              const rawIndices = metadata.listedIn.split(',').map(idx => idx.trim()).filter(Boolean);
              
              // Priority order for index badges
              const priorityOrder = [
                'mznpi', 'kmi30', 'mii30', 'kmiallshr', 'kse30', 'psxdiv20', 
                'kse100', 'kse100pr', 'bkti30', 'jsmfi', 'ogti', 'upp9', 
                'nitpgi', 'hbltti', 'jsgbkti', 'aci'
              ];
              
              // Sort indices: priority indices first (in order), then rest
              const indices = rawIndices.sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                const aIndex = priorityOrder.findIndex(p => p.toLowerCase() === aLower);
                const bIndex = priorityOrder.findIndex(p => p.toLowerCase() === bLower);
                
                // Both are priority indices - sort by priority order
                if (aIndex !== -1 && bIndex !== -1) {
                  return aIndex - bIndex;
                }
                // Only a is priority - a comes first
                if (aIndex !== -1) {
                  return -1;
                }
                // Only b is priority - b comes first
                if (bIndex !== -1) {
                  return 1;
                }
                // Neither is priority - maintain original order
                return 0;
              });
              
              return indices.length > 0 ? (
                <>
                  {indices.map((index) => (
                    <Badge key={index} variant="neutral">
                      {index}
                    </Badge>
                  ))}
                </>
              ) : null;
            })()}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
        {/* Overview Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
            Overview
          </h2>
          
          {/* Current Price Card */}
          {metadata?.currentPrice && (
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Current Price</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                      ₨{formatNumber(metadata.currentPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Change</p>
                    <p className={`text-2xl font-bold ${
                      (metadata.priceChange || 0) >= 0 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {metadata.priceChange !== undefined ? formatNumber(metadata.priceChange) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Change %</p>
                    <p className={`text-2xl font-bold ${
                      (metadata.priceChangePercent || 0) >= 0 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {metadata.priceChangePercent !== undefined ? formatPercent(metadata.priceChangePercent) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investment Position Card (if owned) */}
          {ownedStock && metadata?.currentPrice && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Your Investment Position
                  </h3>
                  <Badge variant="success">Owned</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Shares</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {ownedStock.shares.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Avg Buy Price</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      ₨{formatNumber(ownedStock.avgBuy)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Invested</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      ₨{formatNumber(ownedStock.shares * ownedStock.avgBuy)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Current Value</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      ₨{formatNumber(ownedStock.shares * metadata.currentPrice)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Gain/Loss</p>
                      <p className={`text-xl font-bold ${
                        ((metadata.currentPrice - ownedStock.avgBuy) * ownedStock.shares) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {((metadata.currentPrice - ownedStock.avgBuy) * ownedStock.shares) >= 0 ? '+' : ''}
                        ₨{formatNumber((metadata.currentPrice - ownedStock.avgBuy) * ownedStock.shares)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Return %</p>
                      <p className={`text-xl font-bold ${
                        ((metadata.currentPrice - ownedStock.avgBuy) / ownedStock.avgBuy * 100) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {((metadata.currentPrice - ownedStock.avgBuy) / ownedStock.avgBuy * 100) >= 0 ? '+' : ''}
                        {formatPercent(((metadata.currentPrice - ownedStock.avgBuy) / ownedStock.avgBuy * 100))}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Price History Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
            Price History
          </h2>
          
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Historical Price Data
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {hasData 
                      ? `5 years of daily closing prices`
                      : 'Historical price data not yet loaded'
                    }
                  </p>
                </div>
              
              {!hasData && (
                <Button
                  variant="primary"
                  onClick={handleFetchData}
                  disabled={fetching}
                  className="flex items-center gap-2"
                >
                  {fetching ? (
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

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium">Failed to load data</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {fetching && !hasData && (
              <div className="py-12 text-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4 dark:border-indigo-900 dark:border-t-indigo-400" />
                <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Fetching 5 Years of Data
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This may take 10-15 seconds...
                </p>
              </div>
            )}

            {hasData && (
              <>
                {/* Time Range Selector */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <TimeRangeSelector
                    selected={selectedRange}
                    onChange={setSelectedRange}
                    onCustomRangeApply={applyCustomRange}
                    dataRange={dataRange || undefined}
                    disabled={loading}
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
                  data={data}
                  symbol={symbol}
                  range={selectedRange}
                  loading={loading}
                />

                {/* Stats */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">High</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        ₨{formatNumber(stats.high)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Low</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        ₨{formatNumber(stats.low)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Change</p>
                      <p className={`text-lg font-bold ${
                        stats.change >= 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {stats.change >= 0 ? '+' : ''}{formatNumber(stats.change)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Change %</p>
                      <p className={`text-lg font-bold ${
                        stats.changePercent >= 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {formatPercent(stats.changePercent)}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            </CardContent>
          </Card>
        </div>

        {/* AI Financial Chatbot */}
        <AIFinancialChatbot 
          initialContext={{ symbol, mode: 'stock' }}
          stocks={portfolioStocks}
        />

        {/* Company Information Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
            Company Profile
          </h2>
          
          <Card>
            <CardContent className="p-6">
              <CompanyInfo symbol={symbol} />
            </CardContent>
          </Card>
        </div>

        {/* Dividends & Free Float Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
            Dividends & Shareholder Info
          </h2>
          
          {/* Dividend History */}
          <Card>
            <CardContent className="p-6">
              <DividendHistory symbol={symbol} />
            </CardContent>
          </Card>

          {/* Free Float History */}
          <Card>
            <CardContent className="p-6">
              <FreeFloatHistory symbol={symbol} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

