'use client';

import React, { useMemo } from 'react';
import { IndexData } from './IndicesTable';

interface IndicesStatsCardsProps {
    indices: IndexData[];
}

export default function IndicesStatsCards({ indices }: IndicesStatsCardsProps) {
    const stats = useMemo(() => {
        let totalVolume = 0;
        let totalValue = 0;
        let gainers = 0;
        let losers = 0;
        let unchanged = 0;

        indices.forEach(index => {
            const volume = index.latestPrice?.volume || 0;
            const value = index.latestPrice?.value || 0;
            const change = index.latestPrice?.change || 0;

            totalVolume += volume;
            totalValue += value;

            if (change > 0) gainers++;
            else if (change < 0) losers++;
            else unchanged++;
        });

        return {
            totalVolume,
            totalValue,
            gainers,
            losers,
            unchanged,
            count: indices.length
        };
    }, [indices]);

    const formatNumber = (num: number) => {
        if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
        return num.toLocaleString();
    };

    const cards = [
        {
            title: 'Total Volume',
            value: formatNumber(stats.totalVolume),
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            color: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100',
            iconBg: 'bg-white/60 dark:bg-blue-800/50',
            borderColor: 'border-blue-200 dark:border-blue-800',
        },
        {
            title: 'Total Value',
            value: `₨${formatNumber(stats.totalValue)}`,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
            ),
            color: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100',
            iconBg: 'bg-white/60 dark:bg-indigo-800/50',
            borderColor: 'border-indigo-200 dark:border-indigo-800',
        },
        {
            title: 'Market Breadth',
            value: `${stats.gainers} Up / ${stats.losers} Down`,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
            ),
            color: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
            iconBg: 'bg-white/60 dark:bg-amber-800/50',
            borderColor: 'border-amber-200 dark:border-amber-800',
        },
        {
            title: 'Active Indices',
            value: stats.count.toString(),
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
            iconBg: 'bg-white/60 dark:bg-emerald-800/50',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                            <h3 className="text-2xl font-bold tracking-tight">
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
