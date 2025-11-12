'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Stock } from '../lib/portfolioData';
import { Card, CardContent } from './ui/Card';
import { useSymbolMetadata } from '../hooks/useSymbolMetadata';

interface PortfolioTableProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
  onEditStock?: (stock: Stock) => void;
  onDeleteStock?: (stock: Stock) => void;
}

export default function PortfolioTable({ stocks, onSelectStock, onEditStock, onDeleteStock }: PortfolioTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Stock | 'gainLoss' | 'gainLossPercent'>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Fetch metadata for all stocks to get isNonCompliant
  const symbols = useMemo(() => stocks.map(s => s.symbol), [stocks]);
  const { metadata } = useSymbolMetadata(symbols);

  const handleSort = (field: keyof Stock | 'gainLoss' | 'gainLossPercent') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedStocks = useMemo(() => {
    let result = [...stocks];

    // Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((stock) =>
        stock.symbol.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sortField === 'gainLoss') {
        aValue = (a.currentPrice - a.avgBuy) * a.shares;
        bValue = (b.currentPrice - b.avgBuy) * b.shares;
      } else if (sortField === 'gainLossPercent') {
        aValue = ((a.currentPrice - a.avgBuy) / a.avgBuy) * 100;
        bValue = ((b.currentPrice - b.avgBuy) / b.avgBuy) * 100;
      } else if (sortField === 'symbol') {
        return sortDirection === 'asc'
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol);
      } else {
        aValue = a[sortField] as number;
        bValue = b[sortField] as number;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return result;
  }, [stocks, searchTerm, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: string }) => {
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
      <CardContent className="p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('symbol')}
                    className="flex items-center gap-2 font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    Symbol
                    <SortIcon field="symbol" />
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('shares')}
                    className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    Shares
                    <SortIcon field="shares" />
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('avgBuy')}
                    className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    Avg Buy
                    <SortIcon field="avgBuy" />
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('currentPrice')}
                    className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    Current Price
                    <SortIcon field="currentPrice" />
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    Investment
                  </span>
                </th>
                <th className="text-right py-3 px-4">
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    Current Value
                  </span>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('gainLoss')}
                    className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    Gain/Loss
                    <SortIcon field="gainLoss" />
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('gainLossPercent')}
                    className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    Gain/Loss %
                    <SortIcon field="gainLossPercent" />
                  </button>
                </th>
                {(onEditStock || onDeleteStock) && (
                  <th className="text-right py-3 px-4">
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                      Actions
                    </span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedStocks.map((stock) => {
                const investment = stock.shares * stock.avgBuy;
                const currentValue = stock.shares * stock.currentPrice;
                const gainLoss = currentValue - investment;
                const gainLossPercent = ((stock.currentPrice - stock.avgBuy) / stock.avgBuy) * 100;
                const isPositive = gainLoss >= 0;
                const textColor = isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400';

                return (
                  <tr
                    key={stock.symbol}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/symbol/${stock.symbol}`}
                          className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                          title="View price history"
                        >
                          {stock.symbol}
                        </Link>
                        {(() => {
                          const meta = metadata.get(stock.symbol.toUpperCase());
                          return meta?.isNonCompliant !== undefined && (
                            <span
                              title={meta.isNonCompliant ? 'Non-Shariah Compliant' : 'Shariah Compliant'}
                              className="inline-flex items-center"
                            >
                              {meta.isNonCompliant ? (
                                <svg className="w-4 h-4 text-rose-500 dark:text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                          );
                        })()}
                        <button
                          onClick={() => onSelectStock(stock)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition"
                          title="View details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      {stock.shares.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      ₨{stock.avgBuy.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      ₨{stock.currentPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      ₨{investment.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      ₨{currentValue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${textColor}`}>
                      {isPositive ? '+' : ''}₨{gainLoss.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${textColor}`}>
                      {isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%
                    </td>
                    {(onEditStock || onDeleteStock) && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {onEditStock && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditStock(stock);
                              }}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {onDeleteStock && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteStock(stock);
                              }}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition dark:text-rose-400 dark:hover:bg-rose-950/30"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredAndSortedStocks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No stocks found
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Try searching with different keywords.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

