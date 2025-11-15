'use client';

import Link from 'next/link';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { MiniSparkline } from './MiniSparkline';

export interface Company {
  symbol: string;
  name: string;
  sectorName: string;
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  listedIn?: string;
  isNonCompliant: boolean;
  marketCapString?: string | null;
  peRatio?: number | null;
  priceHistory?: number[]; // Optional price history for sparkline
}

export interface FilterOptions {
  sectors: string[];
  indices: string[];
}

interface CompaniesTableProps {
  companies: Company[];
  loading: boolean;
  filterOptions: FilterOptions;
  filtersLoading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedIndex: string;
  onIndexChange: (value: string) => void;
  selectedSector: string;
  onSectorChange: (value: string) => void;
  shariahFilter: 'all' | 'compliant' | 'non-compliant';
  onShariahChange: (value: 'all' | 'compliant' | 'non-compliant') => void;
  onClearFilters: () => void;
  simplified?: boolean;
  showPagination?: boolean;
  title?: string;
  currentPage?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onAddToWatchlist?: (symbol: string) => void;
  watchlistSymbols?: Set<string>;
  sortField?: 'price' | 'changePercent' | 'marketCap' | 'peRatio' | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: 'price' | 'changePercent' | 'marketCap' | 'peRatio' | null) => void;
}

// Priority order for indices
const priorityOrder = [
  'mznpi', 'kmi30', 'mii30', 'kmiallshr', 'kse30', 'psxdiv20',
  'kse100', 'kse100pr', 'bkti30', 'jsmfi', 'ogti', 'upp9',
  'nitpgi', 'hbltti', 'jsgbkti', 'aci'
];

const getSortedIndices = (listedIn?: string) => {
  if (!listedIn) return [];
  const rawIndices = listedIn.split(',').map(idx => idx.trim()).filter(Boolean);
  return rawIndices.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aIndex = priorityOrder.findIndex(p => p.toLowerCase() === aLower);
    const bIndex = priorityOrder.findIndex(p => p.toLowerCase() === bLower);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return aLower.localeCompare(bLower);
  });
};

const formatNumber = (num: number | null | undefined) => {
  if (num === undefined || num === null) return 'N/A';
  return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (num: number | null | undefined) => {
  if (num === undefined || num === null) return 'N/A';
  const formatted = num.toFixed(4);
  return num >= 0 ? `+${formatted}%` : `${formatted}%`;
};

type SortField = 'price' | 'changePercent' | 'marketCap' | 'peRatio' | null;

export default function CompaniesTable({
  companies,
  loading,
  filterOptions,
  filtersLoading,
  searchQuery,
  onSearchChange,
  selectedIndex,
  onIndexChange,
  selectedSector,
  onSectorChange,
  shariahFilter,
  onShariahChange,
  onClearFilters,
  simplified = false,
  showPagination = true,
  title,
  currentPage = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  itemsPerPage = 50,
  onAddToWatchlist,
  watchlistSymbols,
  sortField = null,
  sortDirection = 'asc',
  onSort,
}: CompaniesTableProps) {
  const hasActiveFilters = searchQuery || selectedIndex || selectedSector || shariahFilter !== 'all';

  const handleSort = (field: SortField) => {
    if (onSort) {
      onSort(field);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
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
    <div className="space-y-6">
      {title && (
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
          {title}
        </h2>
      )}

      {/* Filters Section */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Filters
              </h3>
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  onClick={onClearFilters}
                  className="text-sm"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Symbol, name, or sector..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Index Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Index
                </label>
                <select
                  value={selectedIndex}
                  onChange={(e) => onIndexChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  disabled={filtersLoading}
                >
                  <option value="">All Indices</option>
                  {filterOptions.indices.map((index) => (
                    <option key={index} value={index}>
                      {index.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Sector
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => onSectorChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  disabled={filtersLoading}
                >
                  <option value="">All Sectors</option>
                  {filterOptions.sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shariah Compliance Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Shariah Compliance
                </label>
                <select
                  value={shariahFilter}
                  onChange={(e) => onShariahChange(e.target.value as 'all' | 'compliant' | 'non-compliant')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="all">All</option>
                  <option value="compliant">Compliant</option>
                  <option value="non-compliant">Non-Compliant</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      {showPagination && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {loading ? (
            <span>Loading...</span>
          ) : (
            <span>
              Showing {companies.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, total)} of {total} companies
            </span>
          )}
        </div>
      )}

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4 dark:border-indigo-900 dark:border-t-indigo-400" />
              <p className="text-slate-600 dark:text-slate-400">Loading companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-600 dark:text-slate-400 mb-2">No companies found</p>
              {hasActiveFilters && (
                <Button variant="secondary" onClick={onClearFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-4 px-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="py-4 px-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Company Name
                    </th>
                    {!simplified && (
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Sector
                      </th>
                    )}
                    <th 
                      className={`py-4 px-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider ${onSort ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none' : ''}`}
                      onClick={onSort ? () => handleSort('price') : undefined}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Price</span>
                        {onSort && <SortIcon field="price" />}
                      </div>
                    </th>
                    <th 
                      className={`py-4 px-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider w-36 ${onSort ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none' : ''}`}
                      onClick={onSort ? () => handleSort('changePercent') : undefined}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Change %</span>
                        {onSort && <SortIcon field="changePercent" />}
                      </div>
                    </th>
                    {simplified && (
                      <>
                        <th className="py-4 px-4 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Trend
                        </th>
                        {onAddToWatchlist && (
                          <th className="py-4 px-4 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </>
                    )}
                    {!simplified && (
                      <>
                        <th className="py-4 px-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Indices
                        </th>
                        <th className="py-4 px-4 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Shariah
                        </th>
                        <th 
                          className={`py-4 px-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider ${onSort ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none' : ''}`}
                          onClick={onSort ? () => handleSort('marketCap') : undefined}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Market Cap</span>
                            {onSort && <SortIcon field="marketCap" />}
                          </div>
                        </th>
                        <th 
                          className={`py-4 px-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider ${onSort ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none' : ''}`}
                          onClick={onSort ? () => handleSort('peRatio') : undefined}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>P/E Ratio</span>
                            {onSort && <SortIcon field="peRatio" />}
                          </div>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                  {companies.map((company) => {
                    const indices = getSortedIndices(company.listedIn);
                    const priceChangeColor = (company.priceChangePercent || 0) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400';

                    return (
                      <tr
                        key={company.symbol}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="py-4 px-4">
                          <Link
                            href={`/symbol/${company.symbol}`}
                            className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline transition-colors"
                          >
                            {company.symbol}
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-slate-900 dark:text-slate-100">
                          <span className="font-medium">{company.name}</span>
                        </td>
                        {!simplified && (
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-sm">
                            {company.sectorName}
                          </td>
                        )}
                        <td className="py-4 px-4 text-right">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {company.currentPrice ? `₨${formatNumber(company.currentPrice)}` : <span className="text-slate-400">N/A</span>}
                          </span>
                        </td>
                        <td className={`py-4 px-4 text-right font-semibold font-mono w-36 ${priceChangeColor}`}>
                          {formatPercent(company.priceChangePercent)}
                        </td>
                        {simplified && (
                          <td className="py-4 px-4 text-center">
                            {company.priceHistory && company.priceHistory.length > 0 ? (
                              <MiniSparkline
                                data={company.priceHistory}
                                width={60}
                                height={20}
                              />
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        )}
                        {!simplified && (
                          <>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {indices.slice(0, 3).map((index) => (
                                  <Badge key={index} variant="neutral" className="text-xs font-medium">
                                    {index}
                                  </Badge>
                                ))}
                                {indices.length > 3 && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    +{indices.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              {company.isNonCompliant !== undefined && (
                                <span
                                  title={company.isNonCompliant ? 'Non-Shariah Compliant' : 'Shariah Compliant'}
                                  className="inline-flex items-center"
                                >
                                  {company.isNonCompliant ? (
                                    <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {company.marketCapString || <span className="text-slate-400">N/A</span>}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {company.peRatio !== null && company.peRatio !== undefined 
                                  ? company.peRatio.toFixed(2) 
                                  : <span className="text-slate-400">N/A</span>}
                              </span>
                            </td>
                          </>
                        )}
                        {simplified && onAddToWatchlist && (
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/symbol/${company.symbol}`}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
                                title="View details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => onAddToWatchlist(company.symbol)}
                                className={`p-1.5 transition ${
                                  watchlistSymbols?.has(company.symbol)
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400'
                                }`}
                                title={watchlistSymbols?.has(company.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                              >
                                {watchlistSymbols?.has(company.symbol) ? (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {showPagination && !loading && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

