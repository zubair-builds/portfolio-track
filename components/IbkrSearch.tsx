'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
}

interface IbkrSearchProps {
    onAdd: (symbol: string, name: string, exchange: string) => Promise<void>;
}

export default function IbkrSearch({ onAdd }: IbkrSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const search = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`/api/ibkr/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data.results || []);
                setShowResults(true);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(search, 500);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleAdd = async (result: SearchResult) => {
        setQuery('');
        setShowResults(false);
        await onAdd(result.symbol, result.name, result.exchange);
    };

    return (
        <div className="relative w-full max-w-xl" ref={searchRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for symbol (e.g., AAPL, SPY, VOO)..."
                    className="w-full px-4 py-3 pl-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 data-[state=open]:rounded-b-none transition-all"
                />
                <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-96 overflow-y-auto z-50">
                    {results.map((result) => (
                        <button
                            key={`${result.symbol}-${result.exchange}`}
                            onClick={() => handleAdd(result)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                        {result.symbol}
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                        {result.name}
                                    </div>
                                </div>
                                <div className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                                    {result.exchange}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
