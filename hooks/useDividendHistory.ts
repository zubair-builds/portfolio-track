'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DividendRecord } from '../lib/dividendsStore';

interface DividendSummary {
  symbol: string;
  totalDividends: number;
  dividendCount: number;
  avgDividend: number;
  lastDividend: DividendRecord | null;
  nextDividend: DividendRecord | null;
}

interface UseDividendHistoryOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  limit?: number;            // Number of records to fetch
  year?: number;             // Filter by specific year
}

export function useDividendHistory(
  symbol?: string,
  options: UseDividendHistoryOptions = {}
) {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes default
    limit,
    year,
  } = options;

  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [summary, setSummary] = useState<DividendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDividends = useCallback(async () => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (year) params.append('year', year.toString());

      const response = await fetch(
        `/api/dividends/${encodeURIComponent(symbol)}?${params.toString()}`
      );

      if (response.status === 404) {
        setDividends([]);
        setError(`No dividend history found for ${symbol}`);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.dividends) {
        setDividends(data.dividends);
        setLastUpdated(new Date());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching dividend history:', err);
      setError('Failed to load dividend history');
      setDividends([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, limit, year]);

  const fetchSummary = useCallback(async () => {
    if (!symbol) return;

    try {
      const response = await fetch(
        `/api/dividends/${encodeURIComponent(symbol)}?summary=true`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching dividend summary:', err);
    }
  }, [symbol]);

  const refresh = useCallback(async () => {
    if (!symbol || refreshing) return;

    setRefreshing(true);
    setError(null);

    try {
      // Fetch fresh data from PSX Terminal API
      const response = await fetch(`/api/dividends/${encodeURIComponent(symbol)}/refresh`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.dividends) {
        setDividends(data.dividends);
        setLastUpdated(new Date());

        // Also refresh summary
        await fetchSummary();
      } else {
        throw new Error(data.error || 'Failed to refresh dividend history');
      }
    } catch (err: any) {
      console.error('Error refreshing dividend history:', err);
      setError(err.message || 'Failed to refresh dividend history');
    } finally {
      setRefreshing(false);
    }
  }, [symbol, refreshing, fetchSummary]);

  // Initial fetch
  useEffect(() => {
    if (symbol) {
      fetchDividends();
      fetchSummary();
    }
  }, [symbol, fetchDividends, fetchSummary]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !symbol) return;

    const interval = setInterval(() => {
      fetchDividends();
      fetchSummary();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, symbol, refreshInterval, fetchDividends, fetchSummary]);

  return {
    dividends,
    summary,
    loading,
    error,
    lastUpdated,
    refreshing,
    refresh,
  };
}

