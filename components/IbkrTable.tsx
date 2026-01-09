'use client';

interface PortfolioItem {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    currency?: string;
    marketState?: string;
    exchange: string;
    includeInStrategy?: boolean;
}

interface IbkrTableProps {
    items: PortfolioItem[];
    onDelete: (symbol: string) => Promise<void>;
    onToggleStrategy?: (symbol: string, current: boolean) => Promise<void>;
    loading: boolean;
}

export default function IbkrTable({ items, onDelete, onToggleStrategy, loading }: IbkrTableProps) {
    if (loading) {
        return (
            <div className="w-full p-8 flex justify-center text-slate-500">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-lg font-medium">Your portfolio is empty</p>
                <p className="text-sm mt-1">Search for a symbol above to get started</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                        <th className="px-6 py-4 font-semibold">Symbol</th>
                        <th className="px-6 py-4 font-semibold">Name</th>
                        <th className="px-6 py-4 font-semibold">Strategy</th>
                        <th className="px-6 py-4 font-semibold text-right">Price</th>
                        <th className="px-6 py-4 font-semibold text-right">Change</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => {
                        const isPositive = item.change >= 0;
                        const currencySymbol = item.currency === 'USD' ? '$' : item.currency || '';

                        return (
                            <tr key={item.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                    {item.symbol}
                                    <div className="text-xs font-normal text-slate-500">{item.exchange}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                    {item.name}
                                </td>
                                <td className="px-6 py-4">
                                    {onToggleStrategy && (
                                        <button
                                            onClick={() => onToggleStrategy(item.symbol, !!item.includeInStrategy)}
                                            className={`
                                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                                                ${item.includeInStrategy ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}
                                            `}
                                            title={item.includeInStrategy ? 'Strategy Active' : 'Enable Strategy'}
                                        >
                                            <span
                                                className={`
                                                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                                    ${item.includeInStrategy ? 'translate-x-6' : 'translate-x-1'}
                                                `}
                                            />
                                        </button>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                                    {currencySymbol}{item.price.toFixed(2)}
                                </td>
                                <td className={`px-6 py-4 text-right font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    <div className="flex items-center justify-end gap-1">
                                        {isPositive ? '▲' : '▼'}
                                        {Math.abs(item.change).toFixed(2)} ({item.changePercent.toFixed(2)}%)
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => onDelete(item.symbol)}
                                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                        title="Remove from watchlist"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
