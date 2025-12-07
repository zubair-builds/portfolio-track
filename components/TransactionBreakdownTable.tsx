'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/Card';
import { Transaction } from '@/lib/emailParser';

interface TransactionSymbolStat {
    company: string;
    count: number;
    totalBuy: number;
    totalSell: number;
    latestDate: string;
}

interface TransactionBreakdownTableProps {
    transactions: Transaction[];
}

export default function TransactionBreakdownTable({
    transactions,
}: TransactionBreakdownTableProps) {
    const [sortField, setSortField] = useState<keyof TransactionSymbolStat>('latestDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

    // 1. Group transactions by company
    const groupedData = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        transactions.forEach(tx => {
            if (!groups[tx.company]) {
                groups[tx.company] = [];
            }
            groups[tx.company].push(tx);
        });

        // 2. Create stats for each group
        const stats: TransactionSymbolStat[] = Object.entries(groups).map(([company, txs]) => {
            let totalBuy = 0;
            let totalSell = 0;

            txs.forEach(tx => {
                const shares = parseInt(tx.shares.replace(/,/g, ''), 10) || 0;
                if (tx.action === 'Buy') {
                    totalBuy += shares;
                } else if (tx.action === 'Sell') {
                    totalSell += shares;
                }
            });

            // Find latest date (assuming ISO format YYYY-MM-DD or parseable)
            const latestDate = txs.reduce((latest, tx) => {
                return (!latest || new Date(tx.date) > new Date(latest)) ? tx.date : latest;
            }, '');

            return {
                company,
                count: txs.length,
                totalBuy,
                totalSell,
                latestDate
            };
        });

        return { groups, stats };
    }, [transactions]);

    const handleSort = (field: keyof TransactionSymbolStat) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const toggleExpand = (company: string) => {
        setExpandedCompany(expandedCompany === company ? null : company);
    };

    const filteredAndSortedStats = useMemo(() => {
        let result = [...groupedData.stats];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            result = result.filter(
                (stat) => stat.company.toLowerCase().includes(term)
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
    }, [groupedData.stats, searchTerm, sortField, sortDirection]);

    const SortIcon = ({ field }: { field: keyof TransactionSymbolStat }) => {
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

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Transaction Breakdown
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
                    <table className="table-professional table-sticky-header w-full min-w-[800px]">
                        <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-3 px-3 w-12"></th>
                                <th className="text-left py-3 px-3">
                                    <button
                                        onClick={() => handleSort('company')}
                                        className="flex items-center gap-2 font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Company
                                        <SortIcon field="company" />
                                    </button>
                                </th>
                                <th className="text-center py-3 px-3">
                                    <button
                                        onClick={() => handleSort('count')}
                                        className="flex items-center justify-center gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Txns
                                        <SortIcon field="count" />
                                    </button>
                                </th>
                                <th className="text-right py-3 px-3">
                                    <button
                                        onClick={() => handleSort('totalBuy')}
                                        className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Total Buy
                                        <SortIcon field="totalBuy" />
                                    </button>
                                </th>
                                <th className="text-right py-3 px-3">
                                    <button
                                        onClick={() => handleSort('totalSell')}
                                        className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Total Sell
                                        <SortIcon field="totalSell" />
                                    </button>
                                </th>
                                <th className="text-right py-3 px-3">
                                    <button
                                        onClick={() => handleSort('latestDate')}
                                        className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        Latest Date
                                        <SortIcon field="latestDate" />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedStats.map((stat) => (
                                <React.Fragment key={stat.company}>
                                    <tr
                                        onClick={() => toggleExpand(stat.company)}
                                        className={`border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${expandedCompany === stat.company
                                            ? 'bg-indigo-50/50 dark:bg-indigo-900/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <td className="py-3 px-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${expandedCompany === stat.company
                                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                }`}>
                                                <svg
                                                    className={`w-4 h-4 transition-transform duration-200 ${expandedCompany === stat.company ? 'rotate-90' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="font-bold text-slate-900 dark:text-white">{stat.company}</div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                                {stat.count}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 tabular-nums">
                                                {stat.totalBuy.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100 tabular-nums">
                                                {stat.totalSell || '-'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <div className="text-slate-600 dark:text-slate-300 tabular-nums">
                                                {stat.latestDate}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Details Row */}
                                    {expandedCompany === stat.company && (
                                        <tr className="bg-slate-50/80 dark:bg-slate-900/80 shadow-inner">
                                            <td colSpan={6} className="px-4 py-4 sm:px-8">
                                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm ring-1 ring-slate-900/5">
                                                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                            Transaction History for {stat.company}
                                                        </h4>
                                                    </div>

                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-medium">
                                                                <tr>
                                                                    <th className="px-4 py-2">Date</th>
                                                                    <th className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400">Buy</th>
                                                                    <th className="px-4 py-2 text-right text-rose-600 dark:text-rose-400">Sell</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                                {groupedData.groups[stat.company]?.map((tx) => (
                                                                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 tabular-nums">
                                                                            {tx.date}
                                                                        </td>
                                                                        <td className="px-4 py-2.5  font-mono">
                                                                            {tx.action === 'Buy' ? (
                                                                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                                                                    {tx.shares}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-slate-300 dark:text-slate-600">-</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 font-mono">
                                                                            {tx.action === 'Sell' ? (
                                                                                <span className="text-rose-700 dark:text-rose-400 font-medium">
                                                                                    {tx.shares}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-slate-300 dark:text-slate-600">-</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
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
                                    <td colSpan={5} className="py-12 text-center text-slate-500">
                                        No transactions found matching "{searchTerm}"
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
