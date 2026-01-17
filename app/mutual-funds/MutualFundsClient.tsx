'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProfessionalHeader from '../../components/ProfessionalHeader';
import { useAuth } from '../../components/AuthProvider';
import { Card, CardContent } from '../../components/ui/Card';
import { MUTUAL_FUND_AMCS, MUTUAL_FUND_CATEGORIES } from '../../lib/constants';

const ITEMS_PER_PAGE = 10;

export interface MutualFund {
  _id?: string;
  fundCode: string;
  fundName: string;
  amc?: string;
  category?: string;
  sector?: string;
  rating?: string;
  benchmark?: string;
  currentNAV?: number;
  lastNAVUpdate?: Date;
  // Performance metrics (returns in percentage)
  ytdReturn?: number;
  mtdReturn?: number;
  return1Day?: number;
  return15Days?: number;
  return30Days?: number;
  return90Days?: number;
  return180Days?: number;
  return270Days?: number;
  return365Days?: number;
  return2Years?: number;
  return3Years?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function MutualFundsClient() {
  const router = useRouter();
  const { user, initializing, signout } = useAuth();
  const [funds, setFunds] = useState<MutualFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAMC, setSelectedAMC] = useState('');
  const [shariahCompliantOnly, setShariahCompliantOnly] = useState(true); // Default to showing only Shariah compliant
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch funds when filters or page changes
  const fetchFunds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.set('q', debouncedSearchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedAMC) params.set('amc', selectedAMC);
      if (shariahCompliantOnly) params.set('shariah', 'compliant');
      params.set('limit', ITEMS_PER_PAGE.toString());
      params.set('offset', ((currentPage - 1) * ITEMS_PER_PAGE).toString());

      const response = await fetch(`/api/mutual-funds/list?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setFunds(data.funds || []);
        setTotal(data.total || 0);
      } else {
        console.error('Failed to fetch mutual funds');
      }
    } catch (error) {
      console.error('Error fetching mutual funds:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, selectedCategory, selectedAMC, shariahCompliantOnly, currentPage]);

  useEffect(() => {
    fetchFunds();
  }, [fetchFunds]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedAMC('');
    setShariahCompliantOnly(true); // Reset to default (Shariah compliant only)
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleAMCChange = (value: string) => {
    setSelectedAMC(value);
    setCurrentPage(1);
  };

  const handleShariahToggle = (checked: boolean) => {
    setShariahCompliantOnly(checked);
    setCurrentPage(1);
  };

  const handleSignOut = async () => {
    await signout();
    router.replace('/signin');
  };

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/signin');
    }
  }, [initializing, user, router]);

  if (initializing) {
    return null;
  }

  const hasActiveFilters = searchQuery || selectedCategory || selectedAMC || !shariahCompliantOnly;

  const formatNAV = (nav: number | undefined) => {
    if (nav === undefined || nav === null) return 'N/A';
    return `₨ ${nav.toLocaleString('en-PK', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  };

  const formatReturn = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ProfessionalHeader user={user} onSignOut={handleSignOut} />

      <main className="container mx-auto max-w-7xl py-8 px-4 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Mutual Funds
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Browse all available mutual funds from MUFAP
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            {/* Search and Filters */}
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
                  placeholder="Search by fund name, code, or AMC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
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
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Filters:</span>
                
                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                >
                  <option value="">All Categories</option>
                  {MUTUAL_FUND_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* AMC Filter */}
                <select
                  value={selectedAMC}
                  onChange={(e) => handleAMCChange(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                >
                  <option value="">All AMCs</option>
                  {MUTUAL_FUND_AMCS.map((amcName) => (
                    <option key={amcName} value={amcName}>
                      {amcName}
                    </option>
                  ))}
                </select>

                {/* Shariah Compliance Filter */}
                <button
                  onClick={() => handleShariahToggle(!shariahCompliantOnly)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    shariahCompliantOnly
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  Shariah Compliant
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border backdrop-blur-sm bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-white/50 to-white/10 dark:from-slate-800/50 dark:to-slate-900/10">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-indigo-800/50">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">
                  Total Funds
                </p>
                <h3 className="text-2xl font-bold tracking-tight tabular-nums">
                  {total}
                </h3>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20 dark:bg-white/5 blur-2xl" />
          </div>

          <div className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border backdrop-blur-sm bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-white/50 to-white/10 dark:from-slate-800/50 dark:to-slate-900/10">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-blue-800/50">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">
                  Categories
                </p>
                <h3 className="text-2xl font-bold tracking-tight tabular-nums">
                  {MUTUAL_FUND_CATEGORIES.length}
                </h3>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20 dark:bg-white/5 blur-2xl" />
          </div>

          <div className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border backdrop-blur-sm bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-white/50 to-white/10 dark:from-slate-800/50 dark:to-slate-900/10">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-emerald-800/50">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">
                  Showing
                </p>
                <h3 className="text-2xl font-bold tracking-tight tabular-nums">
                  {funds.length} funds
                </h3>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20 dark:bg-white/5 blur-2xl" />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="p-8 text-center text-slate-600 dark:text-slate-400">
                Loading mutual funds...
              </div>
            ) : funds.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 dark:text-slate-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No mutual funds found
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Try searching with different keywords or adjusting your filters.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto -mx-4 px-4">
                  <table className="table-professional table-sticky-header w-full min-w-[1000px]">
                    <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
                      <tr>
                        <th className="py-3 px-3 text-center w-16">
                          #
                        </th>
                        <th className="py-3 px-3 text-left">
                          Fund Name
                        </th>
                        <th className="py-3 px-3 text-left">
                          AMC
                        </th>
                        <th className="py-3 px-3 text-right">
                          NAV
                        </th>
                        <th className="py-3 px-3 text-right">
                          YTD
                        </th>
                        <th className="py-3 px-3 text-right">
                          1 Year
                        </th>
                        <th className="py-3 px-3 text-right">
                          3 Years
                        </th>
                        <th className="py-3 px-3 text-left">
                          Category
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {funds.map((fund, index) => {
                        const ytdReturn = fund.ytdReturn;
                        const return1Year = fund.return365Days;
                        const return3Years = fund.return3Years;
                        const isYtdPositive = ytdReturn !== undefined && ytdReturn >= 0;
                        const is1YearPositive = return1Year !== undefined && return1Year >= 0;
                        const is3YearsPositive = return3Years !== undefined && return3Years >= 0;

                        return (
                          <tr
                            key={fund._id || fund.fundCode}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3 px-3 text-center">
                              <div className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                                {((currentPage - 1) * ITEMS_PER_PAGE) + index + 1}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {fund.fundName}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-slate-600 dark:text-slate-400">
                                {fund.amc || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                                {formatNAV(fund.currentNAV)}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className={`font-medium tabular-nums ${
                                ytdReturn === undefined || ytdReturn === null
                                  ? 'text-slate-500 dark:text-slate-400'
                                  : isYtdPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {formatReturn(ytdReturn)}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className={`font-medium tabular-nums ${
                                return1Year === undefined || return1Year === null
                                  ? 'text-slate-500 dark:text-slate-400'
                                  : is1YearPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {formatReturn(return1Year)}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className={`font-medium tabular-nums ${
                                return3Years === undefined || return3Years === null
                                  ? 'text-slate-500 dark:text-slate-400'
                                  : is3YearsPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {formatReturn(return3Years)}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-slate-600 dark:text-slate-400">
                                {fund.category || 'N/A'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {funds.map((fund, index) => {
                    const ytdReturn = fund.ytdReturn;
                    const return1Year = fund.return365Days;
                    const isYtdPositive = ytdReturn !== undefined && ytdReturn >= 0;
                    const is1YearPositive = return1Year !== undefined && return1Year >= 0;

                    return (
                      <div
                        key={fund._id || fund.fundCode}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums font-medium">
                              #{((currentPage - 1) * ITEMS_PER_PAGE) + index + 1}
                            </span>
                            <div className="font-bold text-lg text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                              {fund.fundName}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                              {formatNAV(fund.currentNAV)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                          <div>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">AMC</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {fund.amc || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Category</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {fund.category || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">YTD Return</span>
                            <span className={`font-medium tabular-nums ${
                              ytdReturn === undefined || ytdReturn === null
                                ? 'text-slate-600 dark:text-slate-400'
                                : isYtdPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {formatReturn(ytdReturn)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">1 Year Return</span>
                            <span className={`font-medium tabular-nums ${
                              return1Year === undefined || return1Year === null
                                ? 'text-slate-600 dark:text-slate-400'
                                : is1YearPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {formatReturn(return1Year)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                      {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} funds
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
