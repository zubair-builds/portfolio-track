'use client';

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import Tabs, { Tab } from "../components/Tabs";
import PortfolioTab from "../components/tabs/PortfolioTab";
import WatchlistTab from "../components/tabs/WatchlistTab";
import AnalyticsTab from "../components/tabs/AnalyticsTab";
import AllocationTab from "../components/tabs/AllocationTab";
import CacheManager from "../components/CacheManager";
import AIFinancialChatbot from "../components/AIFinancialChatbot";
import AddStockModal from "../components/AddStockModal";
import EditStockModal from "../components/EditStockModal";
import AddWatchlistModal from "../components/AddWatchlistModal";
import HeaderSymbolSearch from "../components/HeaderSymbolSearch";
import LiveTicker from "../components/LiveTicker";
import { Stock, WatchlistItem, calculatePortfolioStats } from "../lib/portfolioData";
import { useAuth } from "../components/AuthProvider";
import { useIndexPrices } from "../hooks/useIndexPrices";
import { usePortfolioData } from "../hooks/usePortfolioData";
import ProfessionalHeader from "../components/ProfessionalHeader";
import PortfolioHero from "../components/PortfolioHero";
import KSE100Widget from "../components/KSE100Widget";

export default function Page() {
  const router = useRouter();
  const { user, initializing, signout } = useAuth();
  
  // Memoize the symbols array to prevent unnecessary re-fetches
  const kse100Symbols = useMemo(() => ['KSE100'], []);
  const { indices: [kse100], loading: kse100Loading, error: kse100Error, refresh: refreshKse100 } = useIndexPrices(kse100Symbols, { autoRefresh: false });
  const { stocks: portfolioStocks, watchlist, isLoading: portfolioLoading, isLoadingWatchlist, error: portfolioError, refresh: refreshPortfolioData, loadWatchlist } = usePortfolioData(user?.email, { loadWatchlist: false });
  
  // Extract symbols from portfolio, watchlist, and indices for LiveTicker filter
  const tickerFilteredSymbols = useMemo(() => {
    const portfolioSymbols = portfolioStocks.map(stock => stock.symbol.toUpperCase());
    const watchlistSymbols = watchlist.map(item => item.symbol.toUpperCase());
    // Include index symbols (e.g., KSE100)
    const indexSymbols = kse100 ? ['KSE100'] : [];
    // Combine and remove duplicates
    const allSymbols = [...new Set([...portfolioSymbols, ...watchlistSymbols, ...indexSymbols])];
    return allSymbols;
  }, [portfolioStocks, watchlist, kse100]);
  const [refreshingKse100, setRefreshingKse100] = useState(false);
  
  // Track overall loading state
  const [pageLoaded, setPageLoaded] = useState(false);
  const isDataLoading = kse100Loading || portfolioLoading;
  const hasError = kse100Error || portfolioError;

  // Mark page as loaded after initial data fetch completes
  useEffect(() => {
    if (!isDataLoading && !initializing) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => setPageLoaded(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isDataLoading, initializing]);

  // Removed full-page loading overlay - sections now show their own loading states
  
  // Tab state
  const [activeTab, setActiveTab] = useState('portfolio');

  // Lazy load watchlist when watchlist tab is opened
  const prevTabRef = useRef<string>('portfolio');
  useEffect(() => {
    // Only load when switching TO watchlist tab (not already on it)
    if (activeTab === 'watchlist' && prevTabRef.current !== 'watchlist' && !isLoadingWatchlist && user?.email) {
      loadWatchlist();
    }
    prevTabRef.current = activeTab;
  }, [activeTab, isLoadingWatchlist, user?.email, loadWatchlist]);
  
  // Modal states
  const [fetchingSymbolData, setFetchingSymbolData] = useState(false);
  const [symbolDataMessage, setSymbolDataMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [showAddWatchlist, setShowAddWatchlist] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/signin');
    }
  }, [initializing, user, router]);

  const handleSignOut = () => {
    signout();
    router.replace('/signin');
  };

  const handleRefreshKse100 = async () => {
    if (refreshingKse100) return;
    
    setRefreshingKse100(true);
    try {
      // Step 1: Fetch from PSX Terminal API and update DB
      const response = await fetch('/api/indices/refresh?symbols=KSE100');
      
      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Refresh failed');
      }
      
      // Step 2: Re-fetch from database to update UI
      await refreshKse100();
      
    } catch (error) {
      console.error('Error refreshing KSE100:', error);
      alert('Failed to refresh KSE100 data. Please try again.');
    } finally {
      setRefreshingKse100(false);
    }
  };

  const handleAnalyzeStock = async (stock: Stock) => {
    // AI analysis now available through chatbot
  };

  const handleFetchSymbolData = async (stock: Stock) => {
    setFetchingSymbolData(true);
    setSymbolDataMessage(null);

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: [],
          mode: 'symbols',
          symbol: stock.symbol,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSymbolDataMessage({ type: 'success', text: result.message });
        setTimeout(() => setSymbolDataMessage(null), 5000);
      } else {
        setSymbolDataMessage({ type: 'error', text: result.error || 'Failed to fetch symbol data.' });
        setTimeout(() => setSymbolDataMessage(null), 5000);
      }
    } catch (err) {
      console.error('Error fetching symbol data:', err);
      setSymbolDataMessage({ type: 'error', text: 'Network error while fetching symbol data.' });
      setTimeout(() => setSymbolDataMessage(null), 5000);
    } finally {
      setFetchingSymbolData(false);
    }
  };

  const handleAddStock = async (stockData: { symbol: string; shares: number; avgBuy: number; purchaseDate?: Date }) => {
    if (!user?.email) return;

    const response = await fetch('/api/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.email,
      },
      body: JSON.stringify({
        ...stockData,
        purchaseDate: stockData.purchaseDate?.toISOString(),
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add stock');
    }

    await refreshPortfolioData(); // Reload to fetch updated portfolio
  };

  const handleEditStock = async (stockData: { symbol: string; shares: number; avgBuy: number; purchaseDate?: Date }) => {
    if (!user?.email) return;

    const response = await fetch('/api/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.email,
      },
      body: JSON.stringify({
        ...stockData,
        purchaseDate: stockData.purchaseDate?.toISOString(),
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update stock');
    }

    await refreshPortfolioData(); // Reload to fetch updated portfolio
  };

  const handleDeleteStock = async (stock: Stock) => {
    if (!user?.email) return;
    if (!confirm(`Are you sure you want to remove ${stock.symbol} from your portfolio?`)) return;

    const response = await fetch(`/api/portfolio?symbol=${stock.symbol}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': user.email,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.error || 'Failed to delete stock');
      return;
    }

    await refreshPortfolioData(); // Reload to fetch updated portfolio
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!user?.email) return;

    try {
      const response = await fetch(`/api/portfolio/export?format=${format}`, {
        headers: {
          'X-User-Id': user.email,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export portfolio');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.email) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/portfolio/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.email,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        window.location.reload();
      } else {
        alert(result.error || 'Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Failed to import portfolio. Please check the file format.');
    } finally {
      setImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleAddWatchlist = async (itemData: { symbol: string; thesis?: string; targetPrice?: number; note?: string }) => {
    if (!user?.email) return;

    const response = await fetch('/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.email,
      },
      body: JSON.stringify(itemData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add to watchlist');
    }

    // Refresh only portfolio/watchlist data instead of reloading entire page
    await refreshPortfolioData();
  };

  const handleEditWatchlist = async (itemData: { symbol: string; thesis?: string; targetPrice?: number; note?: string }) => {
    if (!user?.email) return;

    const response = await fetch('/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.email,
      },
      body: JSON.stringify(itemData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update watchlist');
    }

    // Refresh only portfolio/watchlist data instead of reloading entire page
    await refreshPortfolioData();
  };

  const handleDeleteWatchlist = async (item: WatchlistItem) => {
    if (!user?.email) return;
    if (!confirm(`Remove ${item.symbol} from watchlist?`)) return;

    const response = await fetch(`/api/watchlist?symbol=${item.symbol}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': user.email,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.error || 'Failed to remove from watchlist');
      return;
    }

    // Refresh only portfolio/watchlist data instead of reloading entire page
    await refreshPortfolioData();
  };

  // Calculate portfolio stats for hero component (must be before conditional returns)
  const portfolioStats = useMemo(() => calculatePortfolioStats(portfolioStocks), [portfolioStocks]);
  const portfolioReturn = portfolioStats.totalGainLossPercent;

  // Define tabs
  const tabs: Tab[] = [
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'watchlist',
      label: 'Watchlist',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: 'allocation',
      label: 'Allocation',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
  ];

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
          <p className="text-lg font-medium">Initializing dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
          <p className="text-lg font-medium">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
    <div className="flex min-h-screen flex-col">
      {/* Professional Header */}
      <ProfessionalHeader
        user={user}
        onSignOut={handleSignOut}
        marketState={kse100?.marketState}
        onExport={handleExport}
        onImport={handleImport}
        importing={importing}
        onRefresh={handleRefreshKse100}
      />

      <main className="flex-1 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-7xl space-y-4 sm:space-y-5 py-4 sm:py-6 px-4">
          {/* Portfolio Hero Section */}
          {activeTab === 'portfolio' && (
            <PortfolioHero 
              stats={portfolioStats} 
              totalStocks={portfolioStocks.length}
              isLoading={portfolioLoading && portfolioStocks.length === 0}
              benchmarkReturn={kse100 ? kse100.changePercent * 100 : undefined}
              benchmarkName="KSE-100"
            />
          )}

          {/* KSE-100 Widget and Live Ticker Row */}
          {activeTab === 'portfolio' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="lg:col-span-1">
              <KSE100Widget
                index={kse100}
                isLoading={kse100Loading}
                onRefresh={handleRefreshKse100}
                refreshing={refreshingKse100}
              />
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <LiveTicker 
                  marketType="REG" 
                  autoConnect={false}
                  filteredSymbols={tickerFilteredSymbols}
                />
              </div>
            </div>
          </div>
          )}

          {/* Visual Separator */}
          {activeTab === 'portfolio' && (
            <div className="border-t border-slate-200 dark:border-slate-700" />
          )}

          {/* Symbol Data Fetch Message */}
          {symbolDataMessage && (
            <div className={`rounded-lg border p-4 ${
              symbolDataMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
            }`}>
              <div className="flex items-start gap-3">
                {symbolDataMessage.type === 'success' ? (
                  <svg className="h-5 w-5 mt-0.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 mt-0.5 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <div>
                  <p className="font-medium">{symbolDataMessage.text}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="bg-white dark:bg-slate-900/60 sticky top-12 z-40 border-b border-slate-200 dark:border-slate-700">
            <div className="container mx-auto max-w-7xl">
              <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            </div>
          </div>

          {/* Tab Content */}
          <div className="container mx-auto max-w-7xl space-y-6 py-6 px-4">
            {activeTab === 'portfolio' && (
              <PortfolioTab
                stocks={portfolioStocks}
                isLoading={portfolioLoading}
                onEditStock={setEditingStock}
                onDeleteStock={handleDeleteStock}
                onAddStock={() => setShowAddStock(true)}
              />
            )}

            {activeTab === 'watchlist' && (
              <WatchlistTab
                watchlist={watchlist}
                isLoading={isLoadingWatchlist}
                onDeleteItem={handleDeleteWatchlist}
                onAddWatchlist={() => setShowAddWatchlist(true)}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsTab userEmail={user?.email} />
            )}

            {activeTab === 'allocation' && (
              <AllocationTab stocks={portfolioStocks} isLoading={portfolioLoading} />
            )}
            </div>
        </div>
      </main>

      {/* Cache Manager */}
      <CacheManager />


      {/* Fetching Symbol Data Loading Indicator */}
      {fetchingSymbolData && (
        <div className="fixed bottom-4 left-4 z-50 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-lg dark:border-blue-900/60 dark:bg-blue-950/40">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin dark:border-blue-900 dark:border-t-blue-400" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Fetching symbol data...
            </p>
          </div>
        </div>
      )}

      {/* AI Financial Chatbot */}
      <AIFinancialChatbot stocks={portfolioStocks} />

      {/* Add Stock Modal */}
      {showAddStock && (
        <AddStockModal
          onClose={() => setShowAddStock(false)}
          onSave={handleAddStock}
        />
      )}

      {/* Edit Stock Modal */}
      {editingStock && (
        <EditStockModal
          stock={editingStock}
          onClose={() => setEditingStock(null)}
          onSave={handleEditStock}
        />
      )}

      {/* Add Watchlist Modal */}
      {showAddWatchlist && (
        <AddWatchlistModal
          onClose={() => setShowAddWatchlist(false)}
          onSave={handleAddWatchlist}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t bg-white/80 dark:bg-slate-950/70">
        <div className="container mx-auto max-w-7xl flex flex-col items-start justify-between gap-3 py-6 px-4 text-sm text-slate-600 dark:text-slate-400 md:flex-row">
          <span>© {new Date().getFullYear()} My Portfolio Tracker</span>
          <span className="text-xs">This is informational and not investment advice.</span>
        </div>
      </footer>
    </div>
    </>
  );
}

