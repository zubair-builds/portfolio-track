'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePriceHistory } from '../../../hooks/usePriceHistory';
import { useAuth } from '../../../components/AuthProvider';
import { usePortfolioData } from '../../../hooks/usePortfolioData';
import { useDividendData } from '../../../hooks/useDividendData';
import PriceHistoryChart from '../../../components/PriceHistoryChart';
import TimeRangeSelector from '../../../components/TimeRangeSelector';
import { CompanyInfo } from '../../../components/CompanyInfo';
import { DividendHistory } from '../../../components/DividendHistory';
import AIFinancialChatbot from '../../../components/AIFinancialChatbot';
import CompaniesTable, { Company, FilterOptions } from '../../../components/CompaniesTable';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { SymbolHero } from '../../../components/SymbolHero';
import { InvestmentPositionCard } from '../../../components/InvestmentPositionCard';
import ProfessionalHeader from '../../../components/ProfessionalHeader';
import { useIndexPrices } from '../../../hooks/useIndexPrices';

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
  peRatio?: number;
  marketCapString?: string;
  volume?: number;
  freeFloatString?: string;
  dividendYield?: number;
}

export default function SymbolDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.symbol.toUpperCase();
  const router = useRouter();
  const { user, signout } = useAuth();
  const { stocks: portfolioStocks, watchlist, refresh: refreshPortfolioData } = usePortfolioData(user?.email);
  
  // Fetch dividend data with symbol breakdown
  const { dividendStats } = useDividendData(user?.email, { includeBySymbol: true });

  // Fetch KSE100 for market state
  const kse100Symbols = useMemo(() => ['KSE100'], []);
  const { indices: [kse100] } = useIndexPrices(kse100Symbols, { autoRefresh: false });

  const {
    data,
    ohlcData,
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
  
  // Get symbol-specific dividend data
  const symbolDividend = useMemo(() => {
    if (!dividendStats?.bySymbol || !ownedStock) return null;
    const symbolData = dividendStats.bySymbol.find(d => d.symbol === symbol);
    return symbolData || null;
  }, [dividendStats, symbol, ownedStock]);

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

  // Prepare price history for investment position sparkline
  const priceHistoryForSparkline = useMemo(() => {
    if (!data || data.length === 0) return undefined;
    return data.slice(-30).map((item) => ({ date: item.date, price: item.price }));
  }, [data]);

  // Get watchlist symbols for peers table
  const watchlistSymbolsSet = useMemo(() => {
    return new Set(watchlist?.map((item) => item.symbol.toUpperCase()) || []);
  }, [watchlist]);

  const handleAddPeerToWatchlist = async (peerSymbol: string) => {
    if (!user?.email) return;
    const isInWatchlist = watchlistSymbolsSet.has(peerSymbol.toUpperCase());

    try {
      if (isInWatchlist) {
        const response = await fetch(`/api/watchlist?symbol=${peerSymbol}`, {
          method: 'DELETE',
          headers: { 'X-User-Id': user.email },
        });
        if (response.ok) await refreshPortfolioData();
      } else {
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.email,
          },
          body: JSON.stringify({ symbol: peerSymbol }),
        });
        if (response.ok) await refreshPortfolioData();
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    }
  };

  const handleSignOut = () => {
    signout();
    router.replace('/signin');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ProfessionalHeader
        user={user}
        onSignOut={handleSignOut}
        marketState={kse100?.marketState}
        onRefresh={handleRefreshSymbol}
      />

      <main className="space-y-6">
        {/* Hero Section */}
        <SymbolHero
          symbol={symbol}
          companyName={metadata?.name}
          currentPrice={metadata?.currentPrice}
          priceChange={metadata?.priceChange}
          priceChangePercent={metadata?.priceChangePercent}
          volume={metadata?.volume}
          marketCapString={metadata?.marketCapString}
          peRatio={metadata?.peRatio}
          freeFloatString={metadata?.freeFloatString}
          dividendYield={metadata?.dividendYield}
          sectorName={metadata?.sectorName}
          isETF={metadata?.isETF}
          isGEM={metadata?.isGEM}
          isDebt={metadata?.isDebt}
          isNonCompliant={metadata?.isNonCompliant}
          listedIn={metadata?.listedIn}
          onRefresh={handleRefreshSymbol}
          refreshing={refreshing}
          onToggleWatchlist={user ? handleToggleWatchlist : undefined}
          isInWatchlist={isInWatchlist}
          watchlistLoading={watchlistLoading}
          lastUpdated={metadata?.lastFetchedAt}
        />

        <div className="container mx-auto max-w-7xl px-4 space-y-6">
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

          {/* Investment Position Card (if owned) */}
          {ownedStock && metadata?.currentPrice && (
            <InvestmentPositionCard
              shares={ownedStock.shares}
              avgBuy={ownedStock.avgBuy}
              currentPrice={metadata.currentPrice}
              priceHistory={priceHistoryForSparkline}
              dividendYield={metadata.dividendYield}
              receivedDividend={symbolDividend?.netDividend}
              receivedDividendGross={symbolDividend?.grossDividend}
              receivedDividendTax={symbolDividend?.taxDeducted}
            />
          )}

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
                      ohlcData={ohlcData}
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



          {/* Dividends & Free Float Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
              Dividends & Shareholder Info
            </h2>

            {/* Dividend History */}
            <Card>
              <CardContent className="p-6">
                <DividendHistory symbol={symbol} currentPrice={metadata?.currentPrice} />
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
              onAddToWatchlist={user ? handleAddPeerToWatchlist : undefined}
              watchlistSymbols={watchlistSymbolsSet}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
