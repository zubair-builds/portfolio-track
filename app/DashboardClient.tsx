'use client';

import { useEffect, useState, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Tabs, { Tab } from "../components/Tabs";
import PortfolioTab from "../components/tabs/PortfolioTab";
import WatchlistTab from "../components/tabs/WatchlistTab";
import AnalyticsTab from "../components/tabs/AnalyticsTab";
import AllocationTab from "../components/tabs/AllocationTab";
// CacheManager removed
import AIFinancialChatbot from "../components/AIFinancialChatbot";
import AddStockModal from "../components/AddStockModal";

import AddWatchlistModal from "../components/AddWatchlistModal";
import LiveTicker from "../components/LiveTicker";
import { Stock, WatchlistItem, calculatePortfolioStats } from "../lib/portfolioData";
import { useAuth } from "../components/AuthProvider";
import { useIndexPrices } from "../hooks/useIndexPrices";
import { usePortfolioData } from "../hooks/usePortfolioData";
import { useDividendData } from "../hooks/useDividendData";
import ProfessionalHeader from "../components/ProfessionalHeader";
import PortfolioHero from "../components/PortfolioHero";
import KSE100Widget from "../components/KSE100Widget";
import { ConfirmationDialog } from "../components/ui/ConfirmationDialog";

export default function DashboardClient() {
    const router = useRouter();
    const { user, initializing, signout } = useAuth();

    // Memoize the symbols array to prevent unnecessary re-fetches
    const kse100Symbols = useMemo(() => ['KSE100'], []);
    const { indices: [kse100], loading: kse100Loading, refresh: refreshKse100 } = useIndexPrices(kse100Symbols, { autoRefresh: false });
    const { stocks: portfolioStocks, watchlist, isLoading: portfolioLoading, isLoadingWatchlist, refresh: refreshPortfolioData, loadWatchlist } = usePortfolioData(user?.email, { loadWatchlist: false });
    const { dividendStats } = useDividendData(user?.email, { includeBySymbol: true });

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message?: ReactNode;
        confirmLabel?: string;
        confirmVariant?: "primary" | "danger";
        onConfirm: () => Promise<void> | void;
    }>({ open: false, title: "", onConfirm: () => { } });

    const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, open: false }));

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
    // refreshingKse100 state removed

    // Fetch transaction stats for Hero component
    const [transactionStats, setTransactionStats] = useState<{ totalRealizedGains: number; totalCGTPaid: number } | null>(null);

    useEffect(() => {
        async function fetchTransactionStats() {
            if (!user?.email) return;
            try {
                const response = await fetch('/api/transactions/stats');
                if (response.ok) {
                    const data = await response.json();
                    setTransactionStats({
                        totalRealizedGains: data.totalRealizedGains || 0,
                        totalCGTPaid: data.totalCGTPaid || 0,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch transaction stats:', error);
            }
        }
        fetchTransactionStats();
    }, [user?.email]);



    // Track overall loading state

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
    const [showAddStock, setShowAddStock] = useState(false);

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

    // handleRefreshKse100 removed

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



    const handleDeleteStock = async (stock: Stock) => {
        if (!user?.email) return;

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

    const handleDeleteWatchlist = async (item: WatchlistItem) => {
        if (!user?.email) return;
        setConfirmDialog({
            open: true,
            title: `Remove ${item.symbol}?`,
            message: `This will remove ${item.symbol} from your watchlist.`,
            confirmLabel: 'Remove',
            confirmVariant: 'danger',
            onConfirm: async () => {
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

                await refreshPortfolioData();
                closeConfirm();
            },
        });
    };

    // Calculate portfolio stats for hero component (must be before conditional returns)
    const portfolioStats = useMemo(() => {
        const dividendData = dividendStats ? {
            netDividend: dividendStats.totalNet,
            grossDividend: dividendStats.totalGross,
            taxDeducted: dividendStats.totalTax,
            zakatDeducted: dividendStats.totalZakat,
        } : undefined;

        return calculatePortfolioStats(portfolioStocks, 0, dividendData);
    }, [portfolioStocks, dividendStats]);

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
            <div className="flex min-h-screen flex-col bg-[#FDFDFD] dark:bg-[#0B0F19] relative selection:bg-indigo-500/30">
                {/* Global Background Effects - Adjusted opacity for better contrast */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-[1000px] h-[600px] bg-indigo-500/3 dark:bg-indigo-500/5 rounded-full blur-[120px] -translate-y-1/2" />
                    <div className="absolute bottom-0 right-1/4 w-[800px] h-[600px] bg-purple-500/3 dark:bg-purple-500/5 rounded-full blur-[100px] translate-y-1/3" />
                    <div className="absolute top-1/2 left-1/2 w-[600px] h-[400px] bg-pink-500/3 dark:bg-pink-500/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* Professional Header */}
                <div className="relative z-50">
                    <ProfessionalHeader
                        user={user}
                        onSignOut={handleSignOut}
                        marketState={kse100?.marketState}
                    />
                </div>

                <main className="flex-1 relative z-10">
                    <div className="container mx-auto max-w-7xl space-y-8 py-8 px-4 sm:px-6 lg:px-8">
                        {/* Portfolio Hero Section */}
                        {activeTab === 'portfolio' && (
                            <div className="transform transition-all duration-500 ease-out">
                                <PortfolioHero
                                    stats={portfolioStats}
                                    totalStocks={portfolioStocks.length}
                                    isLoading={portfolioLoading && portfolioStocks.length === 0}
                                    transactionStats={transactionStats}
                                />
                            </div>
                        )}

                        {/* KSE-100 Widget and Live Ticker Row */}
                        {activeTab === 'portfolio' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1 h-full">
                                    <div className="h-full rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 shadow-xl shadow-indigo-500/5 ring-1 ring-black/5 overflow-hidden transition-all duration-300 hover:shadow-indigo-500/10">
                                        <KSE100Widget
                                            index={kse100}
                                            isLoading={kse100Loading}
                                        />
                                    </div>
                                </div>
                                <div className="lg:col-span-2 h-full">
                                    <div className="h-full transition-all duration-300 hover:scale-[1.01]">
                                        <LiveTicker
                                            marketType="REG"
                                            autoConnect={false}
                                            filteredSymbols={tickerFilteredSymbols}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tabs Navigation */}
                        <div className="sticky top-4 z-40">
                            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 shadow-lg shadow-indigo-500/5 ring-1 ring-black/5 p-1.5 transition-all duration-300">
                                <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[400px] transition-all duration-500 ease-in-out">
                            {activeTab === 'portfolio' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <PortfolioTab
                                        stocks={portfolioStocks}
                                        isLoading={portfolioLoading}
                                        onEditStock={undefined}
                                        onDeleteStock={handleDeleteStock}
                                        onAddStock={() => setShowAddStock(true)}
                                        onRefresh={refreshPortfolioData}
                                        dividendStats={dividendStats}
                                    />
                                </div>
                            )}

                            {activeTab === 'watchlist' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <WatchlistTab
                                        watchlist={watchlist}
                                        isLoading={isLoadingWatchlist}
                                        onDeleteItem={handleDeleteWatchlist}
                                        onAddWatchlist={() => setShowAddWatchlist(true)}
                                    />
                                </div>
                            )}

                            {activeTab === 'analytics' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <AnalyticsTab userEmail={user?.email} />
                                </div>
                            )}

                            {activeTab === 'allocation' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <AllocationTab stocks={portfolioStocks} isLoading={portfolioLoading} />
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Cache Manager */}
                {/* Cache Manager removed */}

                {/* AI Financial Chatbot */}
                <AIFinancialChatbot stocks={portfolioStocks} />

                {/* Add Stock Modal */}
                {showAddStock && (
                    <AddStockModal
                        onClose={() => setShowAddStock(false)}
                        onSave={handleAddStock}
                    />
                )}

                {/* Add Watchlist Modal */}
                {showAddWatchlist && (
                    <AddWatchlistModal
                        onClose={() => setShowAddWatchlist(false)}
                        onSave={handleAddWatchlist}
                    />
                )}

                <ConfirmationDialog
                    isOpen={confirmDialog.open}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmLabel={confirmDialog.confirmLabel}
                    confirmVariant={confirmDialog.confirmVariant}
                    onCancel={closeConfirm}
                    onConfirm={async () => {
                        await confirmDialog.onConfirm();
                    }}
                />

                {/* Footer */}
                <footer className="mt-auto border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm relative z-10">
                    <div className="container mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 py-8 px-4 text-sm text-slate-500 dark:text-slate-400 md:flex-row">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="font-medium">© {new Date().getFullYear()} My Portfolio Tracker</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</a>
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                Track Portfolio
                            </span>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
