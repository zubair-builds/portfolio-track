'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/Card';

export interface Dividend {
    _id: string;
    symbol: string;
    companyName: string;
    paymentDate?: string;
    shares?: number;
    grossDividend?: number;
    taxDeducted?: number;
    zakatDeducted?: number;
    netDividend?: number;
}

export interface DividendSymbolStat {
    symbol: string;
    companyName: string;
    totalNetDividend: number;
    totalGrossDividend: number;
    totalTaxDeducted: number;
    totalZakatDeducted: number;
    count: number;
}

interface DividendBreakdownTableProps {
    stats: DividendSymbolStat[];
    onToggleExpand: (symbol: string) => void;
    expandedSymbol: string | null;
    symbolDetails: Record<string, Dividend[]>;
    isLoadingDetails?: boolean;
}

export default function DividendBreakdownTable({
    stats,
    onToggleExpand,
    expandedSymbol,
    symbolDetails,
    isLoadingDetails = false,
}: DividendBreakdownTableProps) {
    const [sortField, setSortField] = useState<keyof DividendSymbolStat>('totalNetDividend');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    const handleSort = (field: keyof DividendSymbolStat) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const filteredAndSortedStats = useMemo(() => {
        let result = [...stats];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            result = result.filter(
                (stat) =>
                    stat.symbol.toLowerCase().includes(term) ||
                    stat.companyName.toLowerCase().includes(term)
            );
        }

        result.sort((a, b) => {
            const aValue = a[sortField];
            const bValue = b[sortField];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return sortDirection === 'asc'
                ? (aValue as number) - (bValue as number)
                : (bValue as number) - (aValue as number);
        });

        return result;
    }, [stats, searchTerm, sortField, sortDirection]);

    const SortIcon = ({ field }: { field: keyof DividendSymbolStat }) => {
        if (sortField !== field) {
            return (
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortDirection === 'asc' ? (
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    const formatDate = (date?: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: '2-digit',
        });
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Dividend Breakdown
                    </h2>

                    {/* Search */}
                    <div className="relative max-w-xs w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto -mx-4 px-4">
                    <table className="table-professional table-sticky-header w-full min-w-[900px]">
                        <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-3 px-3 w-12"></th>
                                <th className="text-left py-3 px-3">
                                    <button
                                        onClick={() => handleSort('symbol')}
                                        className="flex items-center gap-2 font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Company
                                        <SortIcon field="symbol" />
                                    </button>
                                </th>
                                <th className="text-center py-3 px-3">
                                    <button
                                        onClick={() => handleSort('count')}
                                        className="flex items-center justify-center gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Payouts
                                        <SortIcon field="count" />
                                    </button>
                                </th>
                                <th className="text-right py-3 px-3">
                                    <button
                                        onClick={() => handleSort('totalGrossDividend')}
                                        className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Gross
                                        <SortIcon field="totalGrossDividend" />
                                    </button>
                                </th>
                                <th className="text-right py-3 px-3">
                                    <button
                                        onClick={() => handleSort('totalTaxDeducted')}
                                        className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Tax
                                        <SortIcon field="totalTaxDeducted" />
                                    </button>
                                </th>
                                <th className="text-right py-3 px-3">
                                    <button
                                        onClick={() => handleSort('totalZakatDeducted')}
                                        className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Zakat
                                        <SortIcon field="totalZakatDeducted" />
                                    </button>
                                </th>
                                <th className="text-right py-3 px-3">
                                    <button
                                        onClick={() => handleSort('totalNetDividend')}
                                        className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Net
                                        <SortIcon field="totalNetDividend" />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedStats.map((stat) => (
                                <React.Fragment key={stat.symbol}>
                                    <tr
                                        onClick={() => onToggleExpand(stat.symbol)}
                                        className={`border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${expandedSymbol === stat.symbol
                                            ? 'bg-indigo-50/50 dark:bg-indigo-900/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <td className="py-3 px-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${expandedSymbol === stat.symbol
                                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                }`}>
                                                <svg
                                                    className={`w-4 h-4 transition-transform duration-200 ${expandedSymbol === stat.symbol ? 'rotate-90' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">{stat.symbol}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                                                    {stat.companyName}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                                {stat.count}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100 tabular-nums">
                                                {stat.totalGrossDividend.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100 tabular-nums">
                                                {stat.totalTaxDeducted.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 tabular-nums">
                                                {stat.totalZakatDeducted.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 tabular-nums">
                                                {stat.totalNetDividend.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* Expanded Details Row */}
                                    {expandedSymbol === stat.symbol && (
                                        <tr className="bg-slate-50/80 dark:bg-slate-900/80 shadow-inner">
                                            <td colSpan={7} className="px-4 py-4 sm:px-8">
                                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm ring-1 ring-slate-900/5">
                                                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                            Payment History
                                                        </h4>
                                                        {isLoadingDetails && !symbolDetails[stat.symbol] && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                                Loading details...
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-medium">
                                                                <tr>
                                                                    <th className="px-4 py-2">Date</th>
                                                                    <th className="px-4 py-2 text-right">Shares</th>
                                                                    <th className="px-4 py-2 text-right">Gross</th>
                                                                    <th className="px-4 py-2 text-right">Tax</th>
                                                                    <th className="px-4 py-2 text-right">Zakat</th>
                                                                    <th className="px-4 py-2 text-right">Net</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                                {symbolDetails[stat.symbol]?.map((detail) => (
                                                                    <tr key={detail._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 tabular-nums">
                                                                            {formatDate(detail.paymentDate)}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300 tabular-nums font-mono">
                                                                            {detail.shares?.toLocaleString() || '-'}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-right">
                                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100 tabular-nums">
                                                                                {detail.grossDividend?.toLocaleString() || '-'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-right">
                                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100 tabular-nums">
                                                                                {detail.taxDeducted?.toLocaleString() || '-'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-right">
                                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 tabular-nums">
                                                                                {detail.zakatDeducted?.toLocaleString() || '-'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-right">
                                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 tabular-nums">
                                                                                {detail.netDividend?.toLocaleString() || '-'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {!symbolDetails[stat.symbol] && !isLoadingDetails && (
                                                                    <tr>
                                                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                                                            No details available
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}

                            {filteredAndSortedStats.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-lg font-medium text-slate-900 dark:text-slate-100">No records found</p>
                                            <p className="text-sm">Try adjusting your search</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
