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
import StockDetailsModal from "../components/StockDetailsModal";
import AIFinancialChatbot from "../components/AIFinancialChatbot";
import AddStockModal from "../components/AddStockModal";
import EditStockModal from "../components/EditStockModal";
import AddWatchlistModal from "../components/AddWatchlistModal";
import HeaderSymbolSearch from "../components/HeaderSymbolSearch";
import { Stock, WatchlistItem } from "../lib/portfolioData";
import { useAuth } from "../components/AuthProvider";
import { useIndexPrices } from "../hooks/useIndexPrices";
import { usePortfolioData } from "../hooks/usePortfolioData";

export default function Page() {
  const router = useRouter();
  const { user, initializing, signout } = useAuth();
  
  // Memoize the symbols array to prevent unnecessary re-fetches
  const kse100Symbols = useMemo(() => ['KSE100'], []);
  const { indices: [kse100], loading: kse100Loading, error: kse100Error, refresh: refreshKse100 } = useIndexPrices(kse100Symbols, { autoRefresh: false });
  const { stocks: portfolioStocks, watchlist, isLoading: portfolioLoading, isLoadingWatchlist, error: portfolioError, refresh: refreshPortfolioData, loadWatchlist } = usePortfolioData(user?.email, { loadWatchlist: false });
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
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
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

  const handleAddStock = async (stockData: { symbol: string; shares: number; avgBuy: number }) => {
    if (!user?.email) return;

    const response = await fetch('/api/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.email,
      },
      body: JSON.stringify(stockData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add stock');
    }

    await refreshPortfolioData(); // Reload to fetch updated portfolio
  };

  const handleEditStock = async (stockData: { symbol: string; shares: number; avgBuy: number }) => {
    if (!user?.email) return;

    const response = await fetch('/api/portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.email,
      },
      body: JSON.stringify(stockData),
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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/70">
        <div className="container mx-auto max-w-7xl flex items-center justify-between py-6 px-4 gap-4">
          <div className="space-y-1 flex-shrink-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              My Portfolio
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Track your stock investments and performance
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-4">
            <Link
              href="/companies"
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition"
            >
              Companies
            </Link>
            <div className="flex-1">
              <HeaderSymbolSearch />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {!kse100Loading && kse100 && (() => {
              const stateMap: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' | 'live'; showPulse: boolean }> = {
                'OPN': { label: 'Live', variant: 'live', showPulse: true },
                'CLS': { label: 'Closed', variant: 'neutral', showPulse: false },
                'SUS': { label: 'Suspended', variant: 'danger', showPulse: false },
                'PRE': { label: 'Pre-market', variant: 'neutral', showPulse: false },
              };
              const stateInfo = stateMap[kse100.marketState || 'OPN'] || { label: 'Live', variant: 'live' as const, showPulse: true };
              return (
                <Badge 
                  variant={stateInfo.variant}
                  className={kse100.marketState === 'PRE' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300' : ''}
                >
                  {stateInfo.showPulse && (
                    <span className="relative inline-flex h-2 w-2 mr-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                    </span>
                  )}
                  {stateInfo.label}
                </Badge>
              );
            })()}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => handleExport('json')}
                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/30"
                title="Export as JSON"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30"
                title="Export as CSV"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <label
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30"
                title="Import Portfolio"
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </label>
            </div>
            <div className="hidden text-right lg:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
            <Button variant="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-7xl space-y-8 py-8 px-4">
          {/* KSE100 Index Banner */}
          {kse100Loading ? (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 shadow-sm dark:border-slate-700 dark:from-indigo-950/30 dark:to-blue-950/30">
              <div className="flex items-center justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
              </div>
            </div>
          ) : kse100 ? (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 shadow-sm dark:border-slate-700 dark:from-indigo-950/30 dark:to-blue-950/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                      {kse100.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </h2>
                    {/*
                    kse100.marketState && (() => {
                      const stateMap: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' | 'live' }> = {
                        'OPN': { label: 'Open', variant: 'success' },
                        'CLS': { label: 'Closed', variant: 'neutral' },
                        'SUS': { label: 'Suspended', variant: 'danger' },
                        'PRE': { label: 'Pre-market', variant: 'neutral' },
                      };
                      const stateInfo = stateMap[kse100.marketState] || { label: kse100.marketState, variant: 'neutral' as const };
                      return (
                        <Badge 
                          variant={stateInfo.variant} 
                          title={`Market State: ${stateInfo.label}`}
                          className={kse100.marketState === 'PRE' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300' : ''}
                        >
                          {stateInfo.label}
                        </Badge>
                      );
                    })()
                    */}
                    <Badge variant={kse100.change >= 0 ? "success" : "danger"}>
                      <span className="font-semibold">
                        {kse100.change >= 0 ? '+' : ''}{kse100.change.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        {' '}
                        ({(kse100.changePercent * 100).toFixed(2)}%)
                      </span>
                    </Badge>
                    <button
                      onClick={handleRefreshKse100}
                      disabled={refreshingKse100}
                      className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/30"
                      title="Refresh from PSX Terminal"
                    >
                      <svg 
                        className={`w-5 h-5 ${refreshingKse100 ? 'animate-spin' : ''}`}
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
                    </button>
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {kse100.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last updated: {new Date(kse100.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">High</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {kse100.high.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Low</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {kse100.low.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Volume</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {(kse100.volume / 1_000_000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Trades</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {kse100.trades.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    KSE-100 Index
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No data available. Click refresh to fetch latest data.
                  </p>
                </div>
                <button
                  onClick={handleRefreshKse100}
                  disabled={refreshingKse100}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg 
                    className={`w-4 h-4 ${refreshingKse100 ? 'animate-spin' : ''}`}
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
                  {refreshingKse100 ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
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
          <div className="bg-white dark:bg-slate-900/60">
            <div className="container mx-auto max-w-7xl">
              <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            </div>
          </div>

          {/* Tab Content */}
          <div className="container mx-auto max-w-7xl space-y-8 py-8 px-4">
            {activeTab === 'portfolio' && (
              <PortfolioTab
                stocks={portfolioStocks}
                isLoading={portfolioLoading}
                onSelectStock={setSelectedStock}
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

      {/* Stock Details Modal */}
      {selectedStock && (
        <StockDetailsModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
          onAnalyzeWithAI={handleAnalyzeStock}
          onFetchSymbolData={handleFetchSymbolData}
        />
      )}

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

