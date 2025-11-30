'use client';

import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import { Badge } from './ui/Badge';
import Link from 'next/link';

interface Constituent {
  symbol: string;
  name: string;
  sectorName: string;
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  marketCapString: string | null;
  peRatio: number | null;
  isNonCompliant: boolean;
}

interface ConstituentsTableProps {
  constituents: string[];
  indexSymbol: string;
}

function formatNumber(num: number | undefined | null, decimals = 2): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function ConstituentsTable({ constituents, indexSymbol }: ConstituentsTableProps) {
  const [constituentsData, setConstituentsData] = useState<Constituent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'symbol' | 'name' | 'sectorName' | 'currentPrice' | 'priceChangePercent'>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    async function fetchConstituentsData() {
      if (!constituents || constituents.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch detailed company data for each constituent
        const promises = constituents.map(async (symbol) => {
          try {
            const response = await fetch(`/api/companies?q=${symbol}&limit=1`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();

            if (data.companies && data.companies.length > 0) {
              const company = data.companies[0];
              // Only return if the symbol matches exactly (case-insensitive)
              if (company.symbol.toUpperCase() === symbol.toUpperCase()) {
                return company;
              }
            }

            // Fallback to basic data if company not found
            return {
              symbol,
              name: symbol,
              sectorName: 'N/A',
              currentPrice: null,
              priceChange: null,
              priceChangePercent: null,
              marketCapString: null,
              peRatio: null,
              isNonCompliant: false,
            };
          } catch (err) {
            return {
              symbol,
              name: symbol,
              sectorName: 'N/A',
              currentPrice: null,
              priceChange: null,
              priceChangePercent: null,
              marketCapString: null,
              peRatio: null,
              isNonCompliant: false,
            };
          }
        });

        const results = await Promise.all(promises);
        setConstituentsData(results);
      } catch (error) {
        console.error('Error fetching constituents data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchConstituentsData();
  }, [constituents]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...constituentsData].sort((a, b) => {
    let aVal: string | number | null | undefined = a[sortField];
    let bVal: string | number | null | undefined = b[sortField];

    // Handle null/undefined values
    if (aVal === null || aVal === undefined) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
    if (bVal === null || bVal === undefined) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

    // String comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    // Number comparison
    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (!constituents || constituents.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">No constituents data available</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th
                className="py-4 px-6 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center gap-2">
                  Symbol
                  <SortIcon field="symbol" />
                </div>
              </th>
              <th
                className="py-4 px-6 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Company Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                className="py-4 px-6 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleSort('sectorName')}
              >
                <div className="flex items-center gap-2">
                  Sector
                  <SortIcon field="sectorName" />
                </div>
              </th>
              <th
                className="py-4 px-6 text-right text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleSort('currentPrice')}
              >
                <div className="flex items-center justify-end gap-2">
                  Current Price
                  <SortIcon field="currentPrice" />
                </div>
              </th>
              <th
                className="py-4 px-6 text-right text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleSort('priceChangePercent')}
              >
                <div className="flex items-center justify-end gap-2">
                  Change %
                  <SortIcon field="priceChangePercent" />
                </div>
              </th>
              <th className="py-4 px-6 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                Market Cap
              </th>
              <th className="py-4 px-6 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-4 px-6">
                    <Skeleton className="h-5 w-20" />
                  </td>
                  <td className="py-4 px-6">
                    <Skeleton className="h-5 w-48" />
                  </td>
                  <td className="py-4 px-6">
                    <Skeleton className="h-5 w-32" />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Skeleton className="h-6 w-20 mx-auto" />
                  </td>
                </tr>
              ))
            ) : (
              sortedData.map((constituent) => {
                const isPositive = (constituent.priceChangePercent || 0) >= 0;
                const changeColor = isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400';

                return (
                  <tr
                    key={constituent.symbol}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <Link
                        href={`/symbol/${constituent.symbol}`}
                        className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      >
                        {constituent.symbol}
                      </Link>
                    </td>
                    <td className="py-4 px-6 text-slate-700 dark:text-slate-300">
                      <div className="max-w-xs truncate">{constituent.name}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-700 dark:text-slate-300">
                      {constituent.sectorName}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-700 dark:text-slate-300 font-medium">
                      {constituent.currentPrice ? `Rs. ${formatNumber(constituent.currentPrice)}` : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {constituent.priceChangePercent !== null ? (
                        <span className={`font-medium ${changeColor}`}>
                          {isPositive ? '+' : ''}{formatNumber(constituent.priceChangePercent)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-700 dark:text-slate-300">
                      {constituent.marketCapString || 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {constituent.isNonCompliant ? (
                        <Badge variant="neutral">Non-Compliant</Badge>
                      ) : (
                        <Badge variant="success">Shariah</Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Total: {constituents.length} constituent{constituents.length !== 1 ? 's' : ''}
        </p>
      </div>
    </Card>
  );
}
