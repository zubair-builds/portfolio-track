/**
 * Dividend Table Component
 * Display dividend data with sorting, filtering, and actions
 */

'use client';

import { useState, useMemo } from 'react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface Dividend {
  _id: string;
  symbol: string;
  companyName: string;
  sector?: string;
  dividendType: 'Cash' | 'Bonus' | 'Right Shares';
  announcementDate: string;
  exDividendDate: string;
  bookClosureStart: string;
  bookClosureEnd: string;
  paymentDate?: string;
  agmDate?: string;
  dividendRate?: number;
  dividendPerShare?: number;
  faceValue?: number;
  bonusRatio?: string;
  rightRatio?: string;
  eligibilityStatus?: 'Upcoming' | 'Eligible' | 'Closed';
  daysUntilPayment?: number;
  // Payment fields
  filerStatus?: string;
  grossDividend?: number;
  netDividend?: number;
  taxDeducted?: number;
  warrantNo?: string;
}

interface DividendTableProps {
  dividends: Dividend[];
  onRefresh?: () => void;
  showActions?: boolean;
  onEdit?: (dividend: Dividend) => void;
  onDelete?: (id: string) => void;
}

type SortField = 'symbol' | 'exDividendDate' | 'paymentDate' | 'dividendType' | 'dividendRate';
type SortDirection = 'asc' | 'desc';

export default function DividendTable({
  dividends,
  onRefresh,
  showActions = false,
  onEdit,
  onDelete
}: DividendTableProps) {
  const [sortField, setSortField] = useState<SortField>('exDividendDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Filtering & Sorting
  const filteredAndSorted = useMemo(() => {
    let filtered = [...dividends];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.symbol.toLowerCase().includes(query) ||
        d.companyName.toLowerCase().includes(query) ||
        (d.sector && d.sector.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(d => d.dividendType === filterType);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(d => d.eligibilityStatus === filterStatus);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: string | number | undefined = a[sortField];
      let bVal: string | number | undefined = b[sortField];

      // Handle dates
      if (sortField === 'exDividendDate' || sortField === 'paymentDate') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const comparison = String(aVal || '').localeCompare(String(bVal || ''));
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [dividends, searchQuery, filterType, filterStatus, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const colors = {
      'Upcoming': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Eligible': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'Closed': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      'Cash': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Bonus': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Right Shares': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type as keyof typeof colors]}`}>
        {type}
      </span>
    );
  };

  const renderDividendValue = (dividend: Dividend) => {
    if (dividend.dividendType === 'Cash') {
      if (dividend.dividendPerShare) {
        return `PKR ${dividend.dividendPerShare.toFixed(2)}/share`;
      }
      if (dividend.dividendRate && dividend.faceValue) {
        const perShare = (dividend.dividendRate / 100) * dividend.faceValue;
        return `${dividend.dividendRate}% (PKR ${perShare.toFixed(2)})`;
      }
      if (dividend.dividendRate) {
        return `${dividend.dividendRate}%`;
      }
    } else if (dividend.dividendType === 'Bonus') {
      return dividend.bonusRatio || '-';
    } else if (dividend.dividendType === 'Right Shares') {
      return dividend.rightRatio || '-';
    }
    return '-';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search symbol, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />

        </div>

        <div className="flex gap-2">
          <span className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
            {filteredAndSorted.length} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th
                className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center gap-1">
                  Symbol
                  {sortField === 'symbol' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                Company
              </th>
              <th
                className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => handleSort('paymentDate')}
              >
                <div className="flex items-center gap-1">
                  Payment
                  {sortField === 'paymentDate' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>

              {/* Payment Columns */}
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Filer</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Gross</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Tax</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Net</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Warrant</th>
              {showActions && (
                <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedData.map((dividend) => (
              <tr
                key={dividend._id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {dividend.symbol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {dividend.companyName}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {formatDate(dividend.paymentDate)}
                </td>

                {/* Payment Data */}
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">{dividend.filerStatus || '-'}</td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{dividend.grossDividend?.toLocaleString() || '-'}</td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{dividend.taxDeducted?.toLocaleString() || '-'}</td>
                <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{dividend.netDividend?.toLocaleString() || '-'}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs font-mono">{dividend.warrantNo || '-'}</td>
                {showActions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(dividend)}
                          className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(dividend._id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
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
            ))}
          </tbody>
        </table>

        {paginatedData.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            No dividends found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of{' '}
            {filteredAndSorted.length} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${currentPage === page
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <Button
              variant="secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
