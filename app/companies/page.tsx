'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HeaderSymbolSearch from '../../components/HeaderSymbolSearch';
import CompaniesTable, { Company, FilterOptions } from '../../components/CompaniesTable';

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

  const handleIndexChange = (value: string) => {
    setSelectedIndex(value);
    setCurrentPage(1);
  };

  const handleSectorChange = (value: string) => {
    setSelectedSector(value);
    setCurrentPage(1);
  };

  const handleShariahChange = (value: 'all' | 'compliant' | 'non-compliant') => {
    setShariahFilter(value);
    setCurrentPage(1);
  };

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
        <CompaniesTable
          companies={companies}
          loading={loading}
          filterOptions={filterOptions}
          filtersLoading={filtersLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedIndex={selectedIndex}
          onIndexChange={handleIndexChange}
          selectedSector={selectedSector}
          onSectorChange={handleSectorChange}
          shariahFilter={shariahFilter}
          onShariahChange={handleShariahChange}
          onClearFilters={handleClearFilters}
          simplified={false}
          showPagination={true}
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          onPageChange={setCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </main>
    </div>
  );
}

