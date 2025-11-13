'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HeaderSymbolSearch from '../../components/HeaderSymbolSearch';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface Company {
  symbol: string;
  name: string;
  sectorName: string;
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  listedIn: string;
  isNonCompliant: boolean;
  marketCapString: string | null;
}

interface FilterOptions {
  sectors: string[];
  indices: string[];
}

const ITEMS_PER_PAGE = 50;

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [shariahFilter, setShariahFilter] = useState<'all' | 'compliant' | 'non-compliant'>('compliant');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ sectors: [], indices: [] });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch('/api/companies/filters');
        if (response.ok) {
          const data = await response.json();
          setFilterOptions(data);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setFiltersLoading(false);
      }
    };

    fetchFilters();
  }, []);

  // Fetch companies when filters or page changes
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.set('q', debouncedSearchQuery);
      if (selectedIndex) params.set('index', selectedIndex);
      if (selectedSector) params.set('sector', selectedSector);
      if (shariahFilter !== 'all') params.set('shariah', shariahFilter);
      params.set('limit', ITEMS_PER_PAGE.toString());
      params.set('offset', ((currentPage - 1) * ITEMS_PER_PAGE).toString());

      const response = await fetch(`/api/companies?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
        setTotal(data.total);
      } else {
        console.error('Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, selectedIndex, selectedSector, shariahFilter, currentPage]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedIndex('');
    setSelectedSector('');
    setShariahFilter('all');
    setCurrentPage(1);
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (num: number | null | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    const formatted = num.toFixed(2);
    return num >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  // Priority order for indices
  const priorityOrder = [
    'mznpi', 'kmi30', 'mii30', 'kmiallshr', 'kse30', 'psxdiv20',
    'kse100', 'kse100pr', 'bkti30', 'jsmfi', 'ogti', 'upp9',
    'nitpgi', 'hbltti', 'jsgbkti', 'aci'
  ];

  const getSortedIndices = (listedIn: string) => {
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

  const hasActiveFilters = searchQuery || selectedIndex || selectedSector || shariahFilter !== 'all';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/70">
        <div className="container mx-auto max-w-7xl flex items-center justify-between py-6 px-4 gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link
              href="/"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Go to main page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Companies
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Browse all listed companies
              </p>
            </div>
          </div>
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <HeaderSymbolSearch />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl py-8 px-4 space-y-6">
        {/* Filters Section */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Filters
                </h2>
                {hasActiveFilters && (
                  <Button
                    variant="secondary"
                    onClick={handleClearFilters}
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
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                    onChange={(e) => {
                      setSelectedIndex(e.target.value);
                      setCurrentPage(1);
                    }}
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
                    onChange={(e) => {
                      setSelectedSector(e.target.value);
                      setCurrentPage(1);
                    }}
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
                    onChange={(e) => {
                      setShariahFilter(e.target.value as 'all' | 'compliant' | 'non-compliant');
                      setCurrentPage(1);
                    }}
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
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {loading ? (
            <span>Loading...</span>
          ) : (
            <span>
              Showing {companies.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} companies
            </span>
          )}
        </div>

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
                  <Button variant="secondary" onClick={handleClearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Company Name
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Sector
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Change %
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Indices
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Shariah
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Market Cap
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {companies.map((company) => {
                      const indices = getSortedIndices(company.listedIn);
                      const priceChangeColor = (company.priceChangePercent || 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400';

                      return (
                        <tr
                          key={company.symbol}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <Link
                              href={`/symbol/${company.symbol}`}
                              className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                            >
                              {company.symbol}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                            {company.name}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {company.sectorName}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100">
                            {company.currentPrice ? `₨${formatNumber(company.currentPrice)}` : 'N/A'}
                          </td>
                          <td className={`py-3 px-4 text-right font-medium ${priceChangeColor}`}>
                            {formatPercent(company.priceChangePercent)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 flex-wrap">
                              {indices.slice(0, 3).map((index) => (
                                <Badge key={index} variant="neutral" className="text-xs">
                                  {index}
                                </Badge>
                              ))}
                              {indices.length > 3 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  +{indices.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
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
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            {company.marketCapString || 'N/A'}
                          </td>
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
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
                    onClick={() => setCurrentPage(pageNum)}
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
      </main>
    </div>
  );
}

