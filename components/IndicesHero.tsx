'use client';

import React from 'react';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import Link from 'next/link';

interface IndicesHeroProps {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  trades: number;
  value: number;
  marketState?: string;
  lastUpdated?: string;
}

function formatNumber(num: number | undefined | null, decimals = 2): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatVolume(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(0);
}

export default function IndicesHero({
  symbol,
  name,
  currentPrice,
  change,
  changePercent,
  high,
  low,
  volume,
  trades,
  value,
  marketState,
  lastUpdated,
}: IndicesHeroProps) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? 'text-emerald-500' : 'text-red-500';
  const changeBg = isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10';

  return (
    <div className="mb-8">
      {/* Back Navigation */}
      <Link
        href="/indices"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Indices
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left: Title & Price */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {symbol}
            </h1>
            {marketState && (
              <Badge variant={marketState === 'OPN' ? 'live' : 'neutral'}>
                {marketState}
              </Badge>
            )}
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            {name}
          </p>

          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">
              {formatNumber(currentPrice)}
            </span>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${changeBg}`}>
              <span className={`text-lg font-semibold ${changeColor}`}>
                {isPositive ? '+' : ''}{formatNumber(change)}
              </span>
              <span className={`text-lg font-semibold ${changeColor}`}>
                ({isPositive ? '+' : ''}{formatNumber(changePercent)}%)
              </span>
            </div>
          </div>

          {lastUpdated && (
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Right: Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:min-w-[400px]">
          <Card className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">High</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {formatNumber(high)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Low</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {formatNumber(low)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Volume</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {formatVolume(volume)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Trades</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {formatNumber(trades, 0)}
            </p>
          </Card>
          <Card className="p-4 col-span-2">
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Value</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              Rs. {formatVolume(value)}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
