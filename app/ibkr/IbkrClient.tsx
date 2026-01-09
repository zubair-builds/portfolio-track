'use client';

import { useState, useEffect, useCallback } from 'react';
import ProfessionalHeader from '../../components/ProfessionalHeader';
import { useAuth } from '../../components/AuthProvider';
import { useRouter } from 'next/navigation';
import IbkrSearch from '../../components/IbkrSearch';
import IbkrTable from '../../components/IbkrTable';
import MeanReversionTable from '../../components/MeanReversionTable';

export default function IbkrClient() {
    const { user, initializing, signout } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [strategyData, setStrategyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [strategyLoading, setStrategyLoading] = useState(false);

    const fetchPortfolio = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ibkr/portfolio');
            if (res.ok) {
                const data = await res.json();
                setItems(data.portfolio || []);
            }
        } catch (error) {
            console.error('Failed to fetch portfolio:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStrategy = useCallback(async () => {
        setStrategyLoading(true);
        try {
            const res = await fetch('/api/ibkr/strategy');
            if (res.ok) {
                const data = await res.json();
                setStrategyData(data.results || []);
            }
        } catch (error) {
            console.error('Failed to fetch strategy analysis:', error);
        } finally {
            setStrategyLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPortfolio();
    }, [fetchPortfolio]);

    // Fetch strategy data whenever portfolio items change (if any items have strategy enabled)
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasStrategyItems = items.some((item: any) => item.includeInStrategy);
        if (hasStrategyItems) {
            fetchStrategy();
        } else {
            setStrategyData([]);
        }
    }, [items, fetchStrategy]);

    const handleAdd = async (symbol: string, name: string, exchange: string) => {
        try {
            const res = await fetch('/api/ibkr/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, name, exchange }),
            });

            if (res.ok) {
                fetchPortfolio();
            }
        } catch (error) {
            console.error('Failed to add ticker:', error);
        }
    };

    const handleDelete = async (symbol: string) => {
        if (!confirm(`Are you sure you want to remove ${symbol}?`)) return;

        try {
            const res = await fetch(`/api/ibkr/portfolio?symbol=${encodeURIComponent(symbol)}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchPortfolio();
            }
        } catch (error) {
            console.error('Failed to delete ticker:', error);
        }
    };

    const handleToggleStrategy = async (symbol: string, current: boolean) => {
        try {
            // Optimistic update
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedItems: any = items.map((item: any) =>
                item.symbol === symbol ? { ...item, includeInStrategy: !current } : item
            );
            setItems(updatedItems);

            const res = await fetch('/api/ibkr/portfolio', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, includeInStrategy: !current }),
            });

            if (!res.ok) {
                // Revert on failure
                fetchPortfolio();
            }
        } catch (error) {
            console.error('Failed to toggle strategy:', error);
            fetchPortfolio();
        }
    };

    const handleSignOut = async () => {
        await signout();
        router.replace('/signin');
    };

    if (initializing) return null;

    if (!user) {
        // Redirect will happen in useEffect in AuthProvider or here
        router.replace('/signin');
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <ProfessionalHeader user={user} onSignOut={handleSignOut} />

            <main className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                            International Portfolio
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Track your global stocks and ETFs
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Add Symbol</h2>
                    <IbkrSearch onAdd={handleAdd} />
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your Watchlist</h2>
                    <IbkrTable
                        items={items}
                        loading={loading}
                        onDelete={handleDelete}
                        onToggleStrategy={handleToggleStrategy}
                    />
                </div>

                {/* Strategy Section */}
                {strategyData.length > 0 && (
                    <div className="space-y-4 pt-8 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mean Reversion Strategy</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Signals based on EMA20/ATR stretch & RSI reversal (Daily)
                                </p>
                            </div>
                            <button
                                onClick={fetchStrategy}
                                className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                                title="Refresh Analysis"
                            >
                                <svg className={`w-5 h-5 ${strategyLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <MeanReversionTable
                            data={strategyData}
                            loading={strategyLoading}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
