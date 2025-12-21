'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProfessionalHeader from '../../components/ProfessionalHeader';
import CompaniesTable, { Company, FilterOptions } from '../../components/CompaniesTable';
import CompaniesStatsCards from '../../components/CompaniesStatsCards';
import { useAuth } from '../../components/AuthProvider';

const ITEMS_PER_PAGE = 50;

export default function CompaniesClient() {
    const router = useRouter();
    const { user, initializing, signout } = useAuth();
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
    const [sortField, setSortField] = useState<'price' | 'changePercent' | 'marketCap' | 'peRatio' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

    // Fetch companies when filters, page, or sort changes
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
            if (sortField) {
                params.set('sortBy', sortField);
                params.set('sortDir', sortDirection);
            }

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
    }, [debouncedSearchQuery, selectedIndex, selectedSector, shariahFilter, currentPage, sortField, sortDirection]);

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

    const handleSort = (field: 'price' | 'changePercent' | 'marketCap' | 'peRatio' | null) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1); // Reset to first page when sorting changes
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <ProfessionalHeader user={user} onSignOut={handleSignOut} />

            <main className="container mx-auto max-w-7xl py-8 px-4 space-y-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                        Companies
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Browse all listed companies on PSX
                    </p>
                </div>

                <CompaniesStatsCards />

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
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                />
            </main>
        </div>
    );
}
