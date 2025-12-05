'use client';

import React from 'react';
import { formatCurrency } from '@/lib/constants';

export interface TransactionStats {
    totalTransactions: number;
    totalBuys: number;
    totalSells: number;
    totalRealizedGains: number;
    totalCGTPaid: number;
}

interface TransactionStatsCardsProps {
    stats: TransactionStats | null;
    loading: boolean;
}

export default function TransactionStatsCards({ stats, loading }: TransactionStatsCardsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: 'Total Transactions',
            value: stats?.totalTransactions || 0,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            ),
            color: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100',
            iconBg: 'bg-white/60 dark:bg-indigo-800/50',
            borderColor: 'border-indigo-200 dark:border-indigo-800',
        },
        {
            title: 'Total Buys',
            value: stats?.totalBuys || 0,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            ),
            color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
            iconBg: 'bg-white/60 dark:bg-emerald-800/50',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
        },
        {
            title: 'Total Sells',
            value: stats?.totalSells || 0,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
            ),
            color: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100',
            iconBg: 'bg-white/60 dark:bg-rose-800/50',
            borderColor: 'border-rose-200 dark:border-rose-800',
        },
        {
            title: 'Net Realized Gains',
            value: `${(stats?.totalRealizedGains || 0) >= 0 ? '+' : ''}${formatCurrency(stats?.totalRealizedGains || 0)}`,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
            color: (stats?.totalRealizedGains || 0) >= 0
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                : 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100',
            iconBg: (stats?.totalRealizedGains || 0) >= 0
                ? 'bg-white/60 dark:bg-emerald-800/50'
                : 'bg-white/60 dark:bg-rose-800/50',
            borderColor: (stats?.totalRealizedGains || 0) >= 0
                ? 'border-emerald-200 dark:border-emerald-800'
                : 'border-rose-200 dark:border-rose-800',
        },
        {
            title: 'Total CGT Paid',
            value: formatCurrency(stats?.totalCGTPaid || 0),
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
            ),
            color: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100',
            iconBg: 'bg-white/60 dark:bg-orange-800/50',
            borderColor: 'border-orange-200 dark:border-orange-800',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border backdrop-blur-sm ${card.color} ${card.borderColor} bg-gradient-to-br from-white/50 to-white/10 dark:from-slate-800/50 dark:to-slate-900/10`}
                >
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${card.iconBg}`}>
                                {card.icon}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium opacity-80 mb-1">
                                {card.title}
                            </p>
                            <h3 className="text-2xl font-bold tracking-tight truncate">
                                {card.value}
                            </h3>
                        </div>
                    </div>

                    {/* Decorative background circle */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20 dark:bg-white/5 blur-2xl" />
                </div>
            ))}
        </div>
    );
}
