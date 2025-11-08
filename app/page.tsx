'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionTitle } from "../components/ui/SectionTitle";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import PortfolioSummary from "../components/PortfolioSummary";
import PortfolioTable from "../components/PortfolioTable";
import PortfolioAllocation from "../components/PortfolioAllocation";
import CacheManager from "../components/CacheManager";
import StockDetailsModal from "../components/StockDetailsModal";
import Watchlist from "../components/Watchlist";
import AIInsightsModal from "../components/AIInsightsModal";
import AddStockModal from "../components/AddStockModal";
import EditStockModal from "../components/EditStockModal";
import AddWatchlistModal from "../components/AddWatchlistModal";
import PortfolioAnalytics from "../components/PortfolioAnalytics";
import { calculatePortfolioStats, Stock, WatchlistItem } from "../lib/portfolioData";
import { usePortfolioData } from "../hooks/usePortfolioData";
import { useAuth } from "../components/AuthProvider";
import { useIndexPrices } from "../hooks/useIndexPrices";

export default function Page() {
  const router = useRouter();
  const { user, initializing, signout } = useAuth();
  const { stocks, watchlist, isLoading, error, lastUpdated } = usePortfolioData(user?.email);
  const { indices: [kse100], loading: indexLoading } = useIndexPrices(['KSE100'], { autoRefresh: true, refreshInterval: 60000 });
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [aiAnalysisStock, setAiAnalysisStock] = useState<Stock | null>(null);
  const [fetchingSymbolData, setFetchingSymbolData] = useState(false);
  const [symbolDataMessage, setSymbolDataMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [deletingStock, setDeletingStock] = useState<Stock | null>(null);
  const [showAddWatchlist, setShowAddWatchlist] = useState(false);
  const [importing, setImporting] = useState(false);
  const portfolioStats = useMemo(() => calculatePortfolioStats(stocks), [stocks]);
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/signin');
    }
  }, [initializing, user, router]);

  const handleSignOut = () => {
    signout();
    router.replace('/signin');
  };

  const handleAnalyzeStock = (stock: Stock) => {
    setAiAnalysisStock(stock);
    setShowAIInsights(true);
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

    window.location.reload(); // Reload to fetch updated portfolio
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

    window.location.reload(); // Reload to fetch updated portfolio
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

    window.location.reload(); // Reload to fetch updated portfolio
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

    window.location.reload();
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

    window.location.reload();
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

    window.location.reload();
  };

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Loading dashboard…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/70">
        <div className="container mx-auto max-w-7xl flex items-center justify-between py-6 px-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              My Portfolio
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Track your stock investments and performance
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isLoading ? (
              <Badge variant="live">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                </span>
                Loading...
              </Badge>
            ) : (
              <Badge variant="live">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                Updated • {lastUpdatedLabel}
              </Badge>
            )}
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
            <Button
              variant="primary"
              onClick={() => setShowAIInsights(true)}
              className="hidden sm:flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Insights
            </Button>
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
          {kse100 && (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 shadow-sm dark:border-slate-700 dark:from-indigo-950/30 dark:to-blue-950/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                      {kse100.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </h2>
                    <Badge variant={kse100.change >= 0 ? "success" : "danger"}>
                      <span className="font-semibold">
                        {kse100.change >= 0 ? '+' : ''}{kse100.change.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        {' '}
                        ({(kse100.changePercent * 100).toFixed(2)}%)
                      </span>
                    </Badge>
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

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 mt-0.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Summary */}
          <section>
            <SectionTitle
              title="Portfolio Overview"
              description="Your investment summary and key metrics"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <PortfolioSummary stats={portfolioStats} />
          </section>

          {/* Portfolio Analytics */}
          <section>
            <SectionTitle
              title="Portfolio Analytics"
              description="Key metrics and diversification insights"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <PortfolioAnalytics userEmail={user?.email} />
          </section>

          {/* Portfolio Allocation */}
          <section>
            <SectionTitle
              title="Portfolio Allocation"
              description="How your investments are distributed"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              }
            />
            <PortfolioAllocation stocks={stocks} />
          </section>

          {/* Watchlist */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle
                title="Watchlist"
                description="Symbols you're monitoring for potential entries"
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12 18 19.5 12 19.5 1.5 12 1.5 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
              />
              <Button
                variant="primary"
                onClick={() => setShowAddWatchlist(true)}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Symbol
              </Button>
            </div>
            <Watchlist 
              items={watchlist} 
              isLoading={isLoading}
              onDeleteItem={handleDeleteWatchlist}
            />
          </section>

          {/* Holdings Table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle
                title="Holdings"
                description={`${stocks.length} stocks in your portfolio`}
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Button
                variant="primary"
                onClick={() => setShowAddStock(true)}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Stock
              </Button>
            </div>
            <PortfolioTable 
              stocks={stocks} 
              onSelectStock={setSelectedStock}
              onEditStock={setEditingStock}
              onDeleteStock={handleDeleteStock}
            />
          </section>
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

      {/* AI Insights Modal */}
      {showAIInsights && (
        <AIInsightsModal
          stocks={stocks}
          onClose={() => {
            setShowAIInsights(false);
            setAiAnalysisStock(null);
          }}
          initialStock={aiAnalysisStock || undefined}
        />
      )}

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
  );
}

