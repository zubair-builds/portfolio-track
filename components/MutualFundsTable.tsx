'use client';

import React, { useState, useMemo } from 'react';
import { MutualFundHolding } from '../hooks/useMutualFundData';
import { Card, CardContent } from './ui/Card';

interface MutualFundsTableProps {
  holdings: MutualFundHolding[];
  onDeleteHolding?: (holding: MutualFundHolding) => void;
}

export default function MutualFundsTable({ holdings, onDeleteHolding }: MutualFundsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof MutualFundHolding | 'gainLoss' | 'gainLossPercent'>('fundCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof MutualFundHolding | 'gainLoss' | 'gainLossPercent') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedHoldings = useMemo(() => {
    let result = [...holdings];

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((holding) =>
        holding.fundCode.toLowerCase().includes(term) ||
        holding.fundName?.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let aVal: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let bVal: any;

      if (sortField === 'gainLoss') {
        aVal = a.gainLoss ?? 0;
        bVal = b.gainLoss ?? 0;
      } else if (sortField === 'gainLossPercent') {
        aVal = a.gainLossPercent ?? 0;
        bVal = b.gainLossPercent ?? 0;
      } else {
        aVal = a[sortField as keyof MutualFundHolding];
        bVal = b[sortField as keyof MutualFundHolding];
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return result;
  }, [holdings, searchTerm, sortField, sortDirection]);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return `₨${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <input
            type="text"
            placeholder="Search by fund code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => handleSort('fundCode')}
                >
                  Fund Code
                  {sortField === 'fundCode' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => handleSort('fundName')}
                >
                  Fund Name
                  {sortField === 'fundName' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => handleSort('totalUnits')}
                >
                  Units
                  {sortField === 'totalUnits' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => handleSort('averageNAV')}
                >
                  Avg NAV
                  {sortField === 'averageNAV' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Current NAV
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => handleSort('currentValue')}
                >
                  Current Value
                  {sortField === 'currentValue' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => handleSort('gainLoss')}
                >
                  Gain/Loss
                  {sortField === 'gainLoss' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredAndSortedHoldings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {holdings.length === 0 ? 'No mutual fund holdings yet' : 'No results found'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedHoldings.map((holding) => (
                  <tr
                    key={holding._id?.toString() || holding.fundCode}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {holding.fundCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {holding.fundName || holding.fundCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                      {holding.totalUnits.toLocaleString('en-PK', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(holding.averageNAV)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(holding.currentNAV)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(holding.currentValue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {holding.gainLoss !== undefined ? (
                        <span
                          className={`font-medium ${holding.gainLoss >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                            }`}
                        >
                          {formatCurrency(holding.gainLoss)} ({formatPercent(holding.gainLossPercent)})
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {onDeleteHolding && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${holding.fundName || holding.fundCode}?`)) {
                              onDeleteHolding(holding);
                            }
                          }}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


