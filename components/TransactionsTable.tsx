/**
 * TransactionsTable Component
 * Displays transaction history with filtering, sorting, and pagination
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from './ui/Button';
import { ConfirmationDialog } from './ui/ConfirmationDialog';
import type { ReactNode } from 'react';
import { Badge } from './ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/GlassTable';
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
  const [sortField, setSortField] = useState<string>('transactionDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // Expanded notes
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message?: ReactNode;
    confirmLabel?: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => Promise<void> | void;
  }>({ open: false, title: '', onConfirm: () => {} });

  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, open: false }));

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy: sortField,
        sortOrder: sortDirection,
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
  }, [dateRange, typeFilter, symbolSearch, page, pageSize, sortField, sortDirection]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async (transactionId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete transaction?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/transactions?transactionId=${transactionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });

          const result = await response.json();

          if (response.ok && result.success) {
            fetchTransactions();
          } else {
            alert(result.error || 'Failed to delete transaction');
          }
        } catch (err) {
          console.error('Error deleting transaction:', err);
          alert('Failed to delete transaction');
        } finally {
          closeConfirm();
        }
      },
    });
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to desc for new field
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="ml-1 text-slate-400 opacity-0 group-hover:opacity-50 transition-opacity">↕</span>;
    return (
      <span className="ml-1 text-indigo-600 dark:text-indigo-400">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Glassmorphic Filters Bar */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">

          {/* Left: Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={symbolSearch}
                onChange={(e) => {
                  setSymbolSearch(e.target.value);
                  setPage(1); // Reset to first page when searching
                }}
                placeholder="Search symbol..."
                className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full sm:w-48"
              />
            </div>

            {/* Type Filter */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {(['all', 'BUY', 'SELL'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${typeFilter === type
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                  {type === 'all' ? 'All' : type === 'BUY' ? 'Buys' : 'Sells'}
                </button>
              ))}
            </div>

            {/* Date Range */}
            <div className="w-full sm:w-auto">
              <DateRangeFilter value={dateRange || undefined} onChange={setDateRange} />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>

            <Button
              variant="secondary"
              onClick={exportToCSV}
              disabled={transactions.length === 0}
              className="hidden sm:flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      {!loading && !error && transactions.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                <TableHead onClick={() => handleSort('transactionDate')}>
                  <div className="flex items-center gap-1">
                    Date <SortIcon field="transactionDate" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('symbol')}>
                  <div className="flex items-center gap-1">
                    Symbol <SortIcon field="symbol" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('transactionType')}>
                  <div className="flex items-center gap-1">
                    Type <SortIcon field="transactionType" />
                  </div>
                </TableHead>
                <TableHead className="text-right" onClick={() => handleSort('shares')}>
                  <div className="flex items-center justify-end gap-1">
                    Shares <SortIcon field="shares" />
                  </div>
                </TableHead>
                <TableHead className="text-right" onClick={() => handleSort('pricePerShare')}>
                  <div className="flex items-center justify-end gap-1">
                    Price <SortIcon field="pricePerShare" />
                  </div>
                </TableHead>
                <TableHead className="text-right" onClick={() => handleSort('totalAmount')}>
                  <div className="flex items-center justify-end gap-1">
                    Total <SortIcon field="totalAmount" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Holding</TableHead>
                <TableHead className="text-right" onClick={() => handleSort('realizedGain')}>
                  <div className="flex items-center justify-end gap-1">
                    Gain/Loss <SortIcon field="realizedGain" />
                  </div>
                </TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-center w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx._id}>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    {new Date(tx.transactionDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/symbol/${tx.symbol.toLowerCase()}`}
                      className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                    >
                      {tx.symbol}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={tx.transactionType === 'BUY' ? 'success' : 'danger'}
                      className="uppercase text-[10px] tracking-wider px-2 py-0.5"
                    >
                      {tx.transactionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-slate-700 dark:text-slate-300">
                    {formatNumber(tx.shares)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(tx.pricePerShare)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(tx.totalAmount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {tx.holdingPeriodDays !== undefined && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.holdingPeriodDays >= 365
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                        {tx.holdingPeriodDays}d
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {tx.realizedGain !== undefined && (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`font-semibold tabular-nums ${tx.realizedGain >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {tx.realizedGain >= 0 ? '+' : ''}{formatCurrency(tx.realizedGain)}
                        </span>
                        {tx.cgtAmount !== undefined && tx.cgtAmount > 0 && (
                          <span className="text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">
                            CGT: {formatCurrency(tx.cgtAmount)}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {tx.notes && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <p className={expandedNotes.has(tx._id) ? '' : 'truncate'}>
                          {tx.notes}
                        </p>
                        {tx.notes.length > 50 && (
                          <button
                            onClick={() => toggleNoteExpansion(tx._id)}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 mt-0.5 font-medium"
                          >
                            {expandedNotes.has(tx._id) ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleDelete(tx._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-900/20"
                      title="Delete transaction"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-900 dark:text-slate-100">{((page - 1) * pageSize) + 1}</span> to <span className="font-medium text-slate-900 dark:text-slate-100">{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-slate-900 dark:text-slate-100">{total}</span> results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-sm h-8 px-3"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
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
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${page === pageNum
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-sm h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        !loading && !error && (
          <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
              No transactions found
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Try adjusting your filters or upload new transactions.
            </p>
          </div>
        )
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-center">
          {error}
        </div>
      )}

      <ConfirmationDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant}
        onCancel={closeConfirm}
        onConfirm={async () => {
          await confirmDialog.onConfirm();
        }}
      />
    </div>
  );
}
