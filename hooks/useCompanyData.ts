'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CompanyData } from '../lib/companiesStore';

interface UseCompanyDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export function useCompanyData(
  symbol?: string,
  options: UseCompanyDataOptions = {}
) {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes default
  } = options;

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCompany = useCallback(async () => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/companies/${encodeURIComponent(symbol)}`);

      if (response.status === 404) {
        setCompany(null);
        setError(`No company data found for ${symbol}`);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.company) {
        setCompany(data.company);
        setLastUpdated(new Date());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError('Failed to load company data');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const refresh = useCallback(async () => {
    if (!symbol || refreshing) return;

    setRefreshing(true);
    setError(null);

    try {
      // Fetch fresh data from PSX Terminal API
      const response = await fetch(`/api/companies/${encodeURIComponent(symbol)}/refresh`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.company) {
        setCompany(data.company);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Failed to refresh company data');
      }
    } catch (err) {
      console.error('Error refreshing company data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh company data');
    } finally {
      setRefreshing(false);
    }
  }, [symbol, refreshing]);

  // Initial fetch
  useEffect(() => {
    if (symbol) {
      fetchCompany();
    }
  }, [symbol, fetchCompany]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !symbol) return;

    const interval = setInterval(() => {
      fetchCompany();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, symbol, refreshInterval, fetchCompany]);

  return {
    company,
    loading,
    error,
    lastUpdated,
    refreshing,
    refresh,
  };
}

