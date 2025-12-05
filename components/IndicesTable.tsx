'use client';

import Link from 'next/link';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

export interface IndexData {
  symbol: string;
  name: string;
  description?: string;
  symbolCount?: number;
  updateFrequency?: string;
  latestPrice?: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    trades: number;
    value: number;
    high: number;
    low: number;
    timestamp: string;
    marketState?: string;
  };
  lastUpdated?: string;
}

interface IndicesTableProps {
  indices: IndexData[];
  loading: boolean;
}

const formatNumber = (num: number | undefined | null, decimals = 2) => {
  if (num === undefined || num === null) return 'N/A';
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatVolume = (num: number | undefined | null) => {
  if (num === undefined || num === null) return 'N/A';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toString();
};

export default function IndicesTable({ indices, loading }: IndicesTableProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (indices.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400">No indices found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="table-professional table-sticky-header w-full">
            <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
              <tr>
                <th className="py-3 px-3 text-left">
                  Index
                </th>
                <th className="py-3 px-3 text-right">
                  Price
                </th>
                <th className="py-3 px-3 text-right">
                  Change
                </th>
                <th className="py-3 px-3 text-right">
                  Volume
                </th>
                <th className="py-3 px-3 text-right">
                  Trades
                </th>
                <th className="py-3 px-3 text-center">
                  Constituents
                </th>
                <th className="py-3 px-3 text-right">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {indices.map((index) => {
                const isPositive = (index.latestPrice?.change ?? 0) >= 0;
                const changePercent = index.latestPrice?.changePercent ?? 0;

                return (
                  <tr
                    key={index.symbol}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <Link
                        href={`/indices/${index.symbol}`}
                        className="block"
                      >
                        <div className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                          {index.symbol.toUpperCase()}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {index.name}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      {formatNumber(index.latestPrice?.price)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className={`font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isPositive ? '+' : ''}{formatNumber(index.latestPrice?.change)}
                      </div>
                      <div className={`text-sm ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isPositive ? '+' : ''}{formatNumber(changePercent)}%
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                      {formatVolume(index.latestPrice?.volume)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                      {formatNumber(index.latestPrice?.trades, 0)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant="secondary">
                        {index.symbolCount || 0} stocks
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                      {formatVolume(index.latestPrice?.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card >
  );
}
