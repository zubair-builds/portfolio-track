'use client';

import React from 'react';

export interface DividendFinancialStats {
    totalNetDividend: number;
    totalGrossDividend: number;
    totalTaxDeducted: number;
    totalZakatDeducted: number;
    count: number;
}

interface DividendStatsCardsProps {
    stats: DividendFinancialStats;
}

export default function DividendStatsCards({ stats }: DividendStatsCardsProps) {
    const cards = [
        {
            title: 'Total Payouts',
            value: stats.count.toLocaleString(),
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
            title: 'Gross Dividend',
            value: `₨${stats.totalGrossDividend.toLocaleString()}`,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
            ),
            color: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100',
            iconBg: 'bg-white/60 dark:bg-blue-800/50',
            borderColor: 'border-blue-200 dark:border-blue-800',
        },
        {
            title: 'Tax Paid',
            value: `₨${stats.totalTaxDeducted.toLocaleString()}`,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
            ),
            color: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100',
            iconBg: 'bg-white/60 dark:bg-rose-800/50',
            borderColor: 'border-rose-200 dark:border-rose-800',
        },
        {
            title: 'Zakat Deducted',
            value: `₨${stats.totalZakatDeducted.toLocaleString()}`,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            color: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
            iconBg: 'bg-white/60 dark:bg-amber-800/50',
            borderColor: 'border-amber-200 dark:border-amber-800',
        },
        {
            title: 'Net Dividend',
            value: `₨${stats.totalNetDividend.toLocaleString()}`,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
            iconBg: 'bg-white/60 dark:bg-emerald-800/50',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:shadow-md border ${card.color} ${card.borderColor}`}
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
