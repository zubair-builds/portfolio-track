/**
 * TransactionsTable Component
 * Displays transaction history with filtering, sorting, and pagination
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import DateRangeFilter, { type DateRangeValue } from './DateRangeFilter';
import { formatNumber, formatCurrency } from '@/lib/constants';

interface Transaction {
  _id: string;
  symbol: string;
  transactionType: 'BUY' | 'SELL';
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  transactionDate: string;
  notes?: string;
  realizedGain?: number;
  cgtAmount?: number;
  holdingPeriodDays?: number;
  createdAt: string;
  lastModified: string;
}

interface TransactionsTableProps {
  userId: string;
  className?: string;
}

export default function TransactionsTable({ className = '' }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'BUY' | 'SELL'>('all');
  const [symbolSearch, setSymbolSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  // Sorting


  // Expanded notes
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (symbolSearch) params.append('symbol', symbolSearch.toUpperCase());
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate.toISOString());
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate.toISOString());

      const response = await fetch(`/api/transactions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTransactions(result.data.transactions);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
      } else {
        setError(result.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [dateRange, typeFilter, symbolSearch, page, pageSize]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions?transactionId=${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        fetchTransactions(); // Refresh list
      } else {
        alert(result.error || 'Failed to delete transaction');
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction');
    }
  };

  const toggleNoteExpansion = (id: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotes(newExpanded);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Symbol', 'Type', 'Shares', 'Price', 'Total', 'Realized Gain', 'CGT', 'Notes'];
    const rows = transactions.map(tx => [
      new Date(tx.transactionDate).toLocaleDateString(),
      tx.symbol,
      tx.transactionType,
      tx.shares.toString(),
      tx.pricePerShare.toFixed(2),
      tx.totalAmount.toFixed(2),
      tx.realizedGain?.toFixed(2) || '',
      tx.cgtAmount?.toFixed(2) || '',
      tx.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Date Range Filter */}
          <DateRangeFilter value={dateRange || undefined} onChange={setDateRange} />

          {/* Type and Symbol Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Transaction Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'BUY' | 'SELL')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Transactions</option>
                <option value="BUY">Buys Only</option>
                <option value="SELL">Sells Only</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Symbol Search
              </label>
              <input
                type="text"
                value={symbolSearch}
                onChange={(e) => setSymbolSearch(e.target.value)}
                placeholder="e.g., OGDC"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Page Size
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="secondary" onClick={exportToCSV} disabled={transactions.length === 0}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4 dark:border-indigo-900 dark:border-t-indigo-400" />
            <p className="text-slate-600 dark:text-slate-400">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button variant="secondary" onClick={fetchTransactions} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No Transactions Found
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {typeFilter !== 'all' || symbolSearch || dateRange
                ? 'Try adjusting your filters'
                : 'Add stocks to your portfolio to start tracking transactions'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Shares
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Holding
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Realized Gain
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                        {new Date(tx.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/symbol/${tx.symbol.toLowerCase()}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          {tx.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={tx.transactionType === 'BUY' ? 'success' : 'danger'}>
                          {tx.transactionType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                        {formatNumber(tx.shares)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                        {formatCurrency(tx.pricePerShare)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(tx.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tx.holdingPeriodDays !== undefined && (
                          <Badge variant={tx.holdingPeriodDays >= 365 ? 'success' : 'secondary'}>
                            {tx.holdingPeriodDays}d
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tx.realizedGain !== undefined && (
                          <div className="space-y-1">
                            <p className={`text-sm font-medium ${tx.realizedGain >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                              }`}>
                              {tx.realizedGain >= 0 ? '+' : ''}{formatCurrency(tx.realizedGain)}
                            </p>
                            {tx.cgtAmount !== undefined && tx.cgtAmount > 0 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400">
                                CGT: {formatCurrency(tx.cgtAmount)}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-xs">
                        {tx.notes && (
                          <div>
                            <p className={expandedNotes.has(tx._id) ? '' : 'truncate'}>
                              {tx.notes}
                            </p>
                            {tx.notes.length > 50 && (
                              <button
                                onClick={() => toggleNoteExpansion(tx._id)}
                                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 mt-1"
                              >
                                {expandedNotes.has(tx._id) ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(tx._id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Delete transaction"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} transactions
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-sm"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'primary' : 'secondary'}
                          onClick={() => setPage(pageNum)}
                          className="text-sm w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
