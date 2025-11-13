'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePriceHistory } from '../../../hooks/usePriceHistory';
import { useAuth } from '../../../components/AuthProvider';
import { usePortfolioData } from '../../../hooks/usePortfolioData';
import PriceHistoryChart from '../../../components/PriceHistoryChart';
import TimeRangeSelector from '../../../components/TimeRangeSelector';
import { CompanyInfo } from '../../../components/CompanyInfo';
import { DividendHistory } from '../../../components/DividendHistory';
import AIFinancialChatbot from '../../../components/AIFinancialChatbot';
import HeaderSymbolSearch from '../../../components/HeaderSymbolSearch';
import CompaniesTable, { Company, FilterOptions } from '../../../components/CompaniesTable';
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
  lastFetchedAt?: string | Date;
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
  const { stocks: portfolioStocks, watchlist, refresh: refreshPortfolioData } = usePortfolioData(user?.email);

  const {
    data,
    loading,
    fetching,
    checking,
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
  const [refreshing, setRefreshing] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Sector peers state
  const [peers, setPeers] = useState<Company[]>([]);
  const [peersLoading, setPeersLoading] = useState(true);
  const [peersError, setPeersError] = useState<string | null>(null);
  const [peersFilterOptions, setPeersFilterOptions] = useState<FilterOptions>({ sectors: [], indices: [] });
  const [peersFiltersLoading, setPeersFiltersLoading] = useState(true);
  const [peersSearchQuery, setPeersSearchQuery] = useState('');
  const [peersSelectedIndex, setPeersSelectedIndex] = useState('');
  const [peersSelectedSector, setPeersSelectedSector] = useState('');
  const [peersShariahFilter, setPeersShariahFilter] = useState<'all' | 'compliant' | 'non-compliant'>('all');

  // Check if user owns this stock
  const ownedStock = portfolioStocks.find(s => s.symbol.toUpperCase() === symbol);

  // Check if symbol is in watchlist
  useEffect(() => {
    if (watchlist && watchlist.length > 0) {
      const inWatchlist = watchlist.some(item => item.symbol.toUpperCase() === symbol);
      setIsInWatchlist(inWatchlist);
    } else {
      setIsInWatchlist(false);
    }
  }, [watchlist, symbol]);

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

  // Update document title with symbol, price, and company name
  useEffect(() => {
    if (metadata) {
      const parts: string[] = [symbol];

      if (metadata.currentPrice !== undefined && metadata.currentPrice !== null) {
        const formattedPrice = metadata.currentPrice.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        parts.push(`₨${formattedPrice}`);
      }

      if (metadata.name) {
        parts.push(metadata.name);
      }

      document.title = parts.join(' | ');
    } else {
      document.title = `${symbol} - Symbol Details`;
    }
  }, [symbol, metadata]);

  // Fetch sector peers
  useEffect(() => {
    const fetchPeers = async () => {
      setPeersLoading(true);
      setPeersError(null);
      try {
        const response = await fetch(`/api/symbols/${symbol}/sector-peers`);
        if (response.ok) {
          const result = await response.json();
          if (result.success !== false && result.peers) {
            setPeers(result.peers);
          } else {
            setPeers([]);
          }
        } else {
          setPeersError('Failed to fetch sector peers');
          setPeers([]);
        }
      } catch (err) {
        console.error('Error fetching sector peers:', err);
        setPeersError('Failed to fetch sector peers');
        setPeers([]);
      } finally {
        setPeersLoading(false);
      }
    };

    fetchPeers();
  }, [symbol]);

  // Fetch filter options for peers
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch('/api/companies/filters');
        if (response.ok) {
          const data = await response.json();
          setPeersFilterOptions(data);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setPeersFiltersLoading(false);
      }
    };

    fetchFilters();
  }, []);

  const handleFetchData = async () => {
    try {
      await fetchAndStore();
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const handleRefreshSymbol = async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      // Refresh price data from PSX Terminal
      const response = await fetch('/api/symbols/refresh-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols: [symbol] }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error('Refresh failed');
      }

      // Refresh metadata to show updated price
      const metadataResponse = await fetch(`/api/symbols/metadata?symbol=${symbol}`);
      if (metadataResponse.ok) {
        const metadataResult = await metadataResponse.json();
        if (metadataResult.success && metadataResult.metadata) {
          setMetadata(metadataResult.metadata);
        }
      }

      // Also refresh price history if available
      if (fetchAndStore) {
        await fetchAndStore();
      }
    } catch (error) {
      console.error('Error refreshing symbol:', error);
      alert('Failed to refresh symbol data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!user?.email || watchlistLoading) return;

    setWatchlistLoading(true);
    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const response = await fetch(`/api/watchlist?symbol=${symbol}`, {
          method: 'DELETE',
          headers: {
            'X-User-Id': user.email,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to remove from watchlist');
        }

        setIsInWatchlist(false);
        // Refresh watchlist data
        await refreshPortfolioData();
      } else {
        // Add to watchlist
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.email,
          },
          body: JSON.stringify({ symbol }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add to watchlist');
        }

        setIsInWatchlist(true);
        // Refresh watchlist data
        await refreshPortfolioData();
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      alert(error instanceof Error ? error.message : 'Failed to update watchlist');
    } finally {
      setWatchlistLoading(false);
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

  // Client-side filtering for peers
  const filteredPeers = useMemo(() => {
    let filtered = [...peers];

    // Search filter
    if (peersSearchQuery) {
      const query = peersSearchQuery.toLowerCase();
      filtered = filtered.filter((peer) =>
        peer.symbol.toLowerCase().includes(query) ||
        peer.name.toLowerCase().includes(query) ||
        peer.sectorName.toLowerCase().includes(query)
      );
    }

    // Index filter
    if (peersSelectedIndex) {
      filtered = filtered.filter((peer) => {
        if (!peer.listedIn) return false;
        return peer.listedIn.toLowerCase().includes(peersSelectedIndex.toLowerCase());
      });
    }

    // Sector filter
    if (peersSelectedSector) {
      filtered = filtered.filter((peer) => peer.sectorName === peersSelectedSector);
    }

    // Shariah filter
    if (peersShariahFilter !== 'all') {
      filtered = filtered.filter((peer) => {
        if (peersShariahFilter === 'compliant') {
          return !peer.isNonCompliant;
        } else {
          return peer.isNonCompliant;
        }
      });
    }

    return filtered;
  }, [peers, peersSearchQuery, peersSelectedIndex, peersSelectedSector, peersShariahFilter]);

  const handleClearPeersFilters = () => {
    setPeersSearchQuery('');
    setPeersSelectedIndex('');
    setPeersSelectedSector('');
    setPeersShariahFilter('all');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/70">
        <div className="container mx-auto max-w-7xl flex items-center justify-between py-6 px-4 gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link
              href="/"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Go to main page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
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
          </div>
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-4">
            <Link
              href="/companies"
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition whitespace-nowrap"
            >
              Companies
            </Link>
            <div className="flex-1">
              <HeaderSymbolSearch />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
        {/* Symbol Info Section */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
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
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <button
                onClick={handleToggleWatchlist}
                disabled={watchlistLoading}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${isInWatchlist
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/50'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-950/50'
                  }`}
                title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {watchlistLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{isInWatchlist ? 'Removing...' : 'Adding...'}</span>
                  </>
                ) : (
                  <>
                    {isInWatchlist ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span>In Watchlist</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>Add to Watchlist</span>
                      </>
                    )}
                  </>
                )}
              </button>
            )}
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleRefreshSymbol}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh symbol data from PSX Terminal"
              >
                {refreshing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
              {metadata?.lastFetchedAt && !refreshing && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Last updated: {(() => {
                    const date = typeof metadata.lastFetchedAt === 'string'
                      ? new Date(metadata.lastFetchedAt)
                      : metadata.lastFetchedAt;
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    if (diffDays < 7) return `${diffDays}d ago`;
                    return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
                  })()}
                </span>
              )}
            </div>
          </div>
        </div>

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
                    <p className={`text-2xl font-bold ${(metadata.priceChange || 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                      }`}>
                      {metadata.priceChange !== undefined ? formatNumber(metadata.priceChange) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Change %</p>
                    <p className={`text-2xl font-bold ${(metadata.priceChangePercent || 0) >= 0
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
                      <p className={`text-xl font-bold ${((metadata.currentPrice - ownedStock.avgBuy) * ownedStock.shares) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                        }`}>
                        {((metadata.currentPrice - ownedStock.avgBuy) * ownedStock.shares) >= 0 ? '+' : ''}
                        ₨{formatNumber((metadata.currentPrice - ownedStock.avgBuy) * ownedStock.shares)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Return %</p>
                      <p className={`text-xl font-bold ${((metadata.currentPrice - ownedStock.avgBuy) / ownedStock.avgBuy * 100) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                        }`}>
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

                {(!hasData && (!checking && !loading && !fetching && !error)) && (
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

              {/* Show loading state when checking, loading, or fetching */}
              {(checking || loading || fetching) && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4 dark:border-indigo-900 dark:border-t-indigo-400" />
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
                    {checking
                      ? 'Loading Chart Data...'
                      : fetching && !hasData
                        ? 'Fetching 5 Years of Data'
                        : 'Loading Chart...'
                    }
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {fetching && !hasData
                      ? 'This may take 10-15 seconds...'
                      : 'Please wait...'
                    }
                  </p>
                </div>
              )}

              {/* Show error only when not loading */}
              {error && !checking && !loading && !fetching && (
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

              {/* Show no data message when checking is complete and no data */}
              {!hasData && !checking && !loading && !fetching && !error && (
                <div className="py-12 text-center">
                  <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    No Chart Data Available
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Historical price data has not been loaded for this symbol yet.
                  </p>
                </div>
              )}

              {/* Show chart only when data is loaded and not loading */}
              {hasData && !checking && !loading && !fetching && (
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
                        <p className={`text-lg font-bold ${stats.change >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {stats.change >= 0 ? '+' : ''}{formatNumber(stats.change)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Change %</p>
                        <p className={`text-lg font-bold ${stats.changePercent >= 0
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

        </div>

        {/* Sector Peers Section */}
        <div className="space-y-6">
          <CompaniesTable
            companies={filteredPeers}
            loading={peersLoading}
            filterOptions={peersFilterOptions}
            filtersLoading={peersFiltersLoading}
            searchQuery={peersSearchQuery}
            onSearchChange={setPeersSearchQuery}
            selectedIndex={peersSelectedIndex}
            onIndexChange={setPeersSelectedIndex}
            selectedSector={peersSelectedSector}
            onSectorChange={setPeersSelectedSector}
            shariahFilter={peersShariahFilter}
            onShariahChange={setPeersShariahFilter}
            onClearFilters={handleClearPeersFilters}
            simplified={true}
            showPagination={false}
            title="Sector Peers"
          />
        </div>
      </main>
    </div>
  );
}

