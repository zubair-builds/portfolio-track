'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Stock,
} from '../lib/portfolioData';
import { Card, CardContent } from './ui/Card';
import { useSymbolMetadata } from '../hooks/useSymbolMetadata';
import ManageStockModal from './ManageStockModal';

interface PortfolioTableProps {
  stocks: Stock[];
  onEditStock?: (stock: Stock) => void;
  onDeleteStock?: (stock: Stock) => void;
  onRefresh?: () => void;
}

export default function PortfolioTable({ stocks, onEditStock, onDeleteStock, onRefresh }: PortfolioTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Stock | 'gainLoss' | 'gainLossPercent'>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  // Removed row expansion; Shares will be shown in main row
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  // Fetch metadata for all stocks to get isNonCompliant
  const symbols = useMemo(() => stocks.map(s => s.symbol), [stocks]);
  const { metadata } = useSymbolMetadata(symbols);

  const openManageModal = (stock: Stock) => {
    setSelectedStock(stock);
    setShowManageModal(true);
  };

  const handleSellComplete = () => {
    setShowManageModal(false);
    setSelectedStock(null);
    if (onRefresh) onRefresh();
  };

  const handleSort = (field: keyof Stock | 'gainLoss' | 'gainLossPercent') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Calculate total portfolio value for weight calculation
  const totalPortfolioValue = useMemo(() => {
    return stocks.reduce((sum, stock) => sum + (stock.shares * stock.currentPrice), 0);
  }, [stocks]);

  const filteredAndSortedStocks = useMemo(() => {
    let result = [...stocks];

    // Apply quick filters
    if (activeFilter) {
      switch (activeFilter) {
        case 'gainers':
          result = result.filter((stock) => {
            const gainLoss = ((stock.currentPrice - stock.avgBuy) / stock.avgBuy) * 100;
            return gainLoss > 0;
          });
          break;
        case 'losers':
          result = result.filter((stock) => {
            const gainLoss = ((stock.currentPrice - stock.avgBuy) / stock.avgBuy) * 100;
            return gainLoss < 0;
          });
          break;
        case 'topHoldings': {
          const totalValue = result.reduce((sum, stock) => sum + (stock.shares * stock.currentPrice), 0);
          result = result.filter((stock) => {
            const currentValue = stock.shares * stock.currentPrice;
            return (currentValue / totalValue) * 100 >= 5; // Top 5% or more
          });
          break;
        }
        case 'newPositions': {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          result = result.filter((stock) => {
            if (!stock.purchaseDate) return false;
            return new Date(stock.purchaseDate) >= thirtyDaysAgo;
          });
          break;
        }
      }
    }

    // Filter by search term
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
  }, [stocks, searchTerm, sortField, sortDirection, activeFilter]);

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
    <>
      <Card>
        <CardContent className="p-6">
          {/* Search and Quick Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
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

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Quick Filters:</span>
              <button
                onClick={() => setActiveFilter(activeFilter === 'gainers' ? null : 'gainers')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${activeFilter === 'gainers'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
              >
                Gainers
              </button>
              <button
                onClick={() => setActiveFilter(activeFilter === 'losers' ? null : 'losers')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${activeFilter === 'losers'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
              >
                Losers
              </button>
              <button
                onClick={() => setActiveFilter(activeFilter === 'topHoldings' ? null : 'topHoldings')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${activeFilter === 'topHoldings'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
              >
                Top Holdings
              </button>
              <button
                onClick={() => setActiveFilter(activeFilter === 'newPositions' ? null : 'newPositions')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${activeFilter === 'newPositions'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
              >
                New Positions
              </button>
              {activeFilter && (
                <button
                  onClick={() => setActiveFilter(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Single table view (no tabs) */}

          {/* Table */}
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] -mx-6 px-6 custom-scrollbar">
            <table className={`table-professional table-sticky-header w-full min-w-[900px]`}>
              <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {/* Symbol */}
                  <th className="text-left py-4 px-4 w-28">
                    <button
                      onClick={() => handleSort('symbol')}
                      className="flex items-center gap-2 font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      Symbol
                      <SortIcon field="symbol" />
                    </button>
                  </th>

                  {/* Shares */}
                  <th className="text-right py-4 px-4">
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                      Shares
                    </span>
                  </th>

                  {/* Price (Grouped) */}
                  <th className="text-right py-4 px-4">
                    <button
                      onClick={() => handleSort('currentPrice')}
                      className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      Price
                      <SortIcon field="currentPrice" />
                    </button>
                  </th>

                  {/* Value (Grouped) */}
                  <th className="text-right py-4 px-4">
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                      Value
                    </span>
                  </th>

                  {/* Weight */}
                  <th className="text-right py-4 px-4 w-32">
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                      Weight
                    </span>
                  </th>

                  {/* Gain/Loss (Grouped) */}
                  <th className="text-right py-4 px-4">
                    <button
                      onClick={() => handleSort('gainLoss')}
                      className="flex items-center justify-end gap-2 w-full font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      Gain/Loss
                      <SortIcon field="gainLoss" />
                    </button>
                  </th>

                  {/* Actions */}
                  {(onEditStock || onDeleteStock) && (
                    <th className="text-right py-4 px-4 w-16">
                      <span className="sr-only">Actions</span>
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

                  const bgColor = isPositive ? 'bg-emerald-50/50 dark:bg-emerald-900/50' : 'bg-rose-50/50 dark:bg-rose-900/50';


                  return (
                    <React.Fragment key={stock.symbol}>
                      <tr
                        className="border-b border-slate-100 dark:border-slate-800 even:bg-slate-50/50 dark:even:bg-slate-800/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
                      >
                        {/* Symbol */}
                        <td className="py-4 px-4 w-28">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/symbol/${stock.symbol}`}
                              className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                              title="View price history"
                            >
                              {stock.symbol}
                            </Link>
                            {stock.positionCount && stock.positionCount > 1 && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                                title={`${stock.positionCount} positions aggregated`}
                              >
                                {stock.positionCount}
                              </span>
                            )}
                            {(() => {
                              const meta = metadata.get(stock.symbol.toUpperCase());
                              return meta?.isNonCompliant !== undefined && (
                                <span
                                  title={meta.isNonCompliant ? 'Non-Shariah Compliant' : 'Shariah Compliant'}
                                  className="inline-flex items-center"
                                >
                                  {meta.isNonCompliant ? (
                                    <svg className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        {/* Shares */}
                        <td className="py-4 px-4 text-right tabular-nums font-medium text-slate-700 dark:text-slate-300">
                          {stock.shares.toLocaleString('en-PK')}
                        </td>

                        {/* Price (Grouped) */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                              ₨{stock.currentPrice.toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              Avg: ₨{stock.avgBuy.toFixed(2)}
                            </span>
                          </div>
                        </td>

                        {/* Value (Grouped) */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                              ₨{currentValue.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              Inv: ₨{investment.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </td>

                        {/* Weight */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums w-10">
                              {totalPortfolioValue > 0 ? ((currentValue / totalPortfolioValue) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                        </td>

                        {/* Gain/Loss (Grouped) */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`font-medium tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {isPositive ? '+' : ''}₨{gainLoss.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium tabular-nums ${isPositive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                              }`}>
                              {isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        {(onEditStock || onDeleteStock) && (
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openManageModal(stock);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                              title="Manage"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                      {/* Expanded row removed */}
                    </React.Fragment>
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

      {/* Unified Manage Modal (Edit + Sell) */}
      {showManageModal && selectedStock && (
        <ManageStockModal
          stock={selectedStock}
          onClose={() => setShowManageModal(false)}
          onDelete={onDeleteStock}
          onSellComplete={handleSellComplete}
          onUpdated={onRefresh}
        />
      )}
    </>
  );
}

