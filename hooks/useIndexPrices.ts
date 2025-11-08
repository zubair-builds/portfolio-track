'use client';

import { useState, useEffect, useCallback } from 'react';

export interface IndexPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trades: number;
  value: number;
  high: number;
  low: number;
  timestamp: Date;
  updateFrequency?: string;
}

interface UseIndexPricesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

/**
 * Hook to fetch and auto-refresh index prices
 * 
 * @param symbols Array of index symbols to track (e.g., ['KSE100', 'KMI30'])
 * @param options Configuration options
 * @returns Indices data, loading state, error, and manual refresh function
 * 
 * @example
 * // Auto-refresh every 60 seconds
 * const { indices, loading, error, refresh } = useIndexPrices(['KSE100', 'KMI30']);
 * 
 * @example
 * // Manual refresh only
 * const { indices, loading, refresh } = useIndexPrices(['KSE100'], { autoRefresh: false });
 */
export function useIndexPrices(
  symbols?: string[],
  options: UseIndexPricesOptions = {}
) {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 60 seconds default
  } = options;

  const [indices, setIndices] = useState<IndexPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchIndices = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch from API
      const response = await fetch('/api/indices');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Filter by symbols if specified
      let filteredIndices = data.indices;
      
      if (symbols && symbols.length > 0) {
        const upperSymbols = symbols.map(s => s.toUpperCase());
        filteredIndices = data.indices.filter((idx: any) =>
          upperSymbols.includes(idx.symbol.toUpperCase())
        );
      }

      // Transform to IndexPrice format
      const transformed: IndexPrice[] = filteredIndices.map((idx: any) => ({
        symbol: idx.symbol,
        name: idx.name,
        price: idx.latestPrice?.price || 0,
        change: idx.latestPrice?.change || 0,
        changePercent: idx.latestPrice?.changePercent || 0,
        volume: idx.latestPrice?.volume || 0,
        trades: idx.latestPrice?.trades || 0,
        value: idx.latestPrice?.value || 0,
        high: idx.latestPrice?.high || 0,
        low: idx.latestPrice?.low || 0,
        timestamp: idx.latestPrice?.timestamp ? new Date(idx.latestPrice.timestamp) : new Date(),
        updateFrequency: idx.updateFrequency,
      }));

      setIndices(transformed);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching indices:', err);
      setError('Failed to load index prices');
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  const refresh = useCallback(async () => {
    setLoading(true);
    
    try {
      // Refresh prices from PSX API
      const queryParams = new URLSearchParams();
      if (symbols && symbols.length > 0) {
        queryParams.set('symbols', symbols.join(','));
      } else {
        queryParams.set('frequency', 'realtime');
      }

      const response = await fetch(`/api/indices/refresh?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // After refresh, fetch updated data
      await fetchIndices();
    } catch (err) {
      console.error('Error refreshing indices:', err);
      setError('Failed to refresh index prices');
      setLoading(false);
    }
  }, [symbols, fetchIndices]);

  // Initial fetch
  useEffect(() => {
    fetchIndices();
  }, [fetchIndices]);

  // Auto-refresh with interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    indices,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}

/**
 * Hook to fetch all indices (no filtering)
 * Useful for listing all indices on a page
 * 
 * @example
 * const { indices, loading } = useAllIndices();
 */
export function useAllIndices(options?: UseIndexPricesOptions) {
  return useIndexPrices(undefined, options);
}

/**
 * Hook to fetch realtime indices with auto-refresh
 * Pre-configured for KSE100, KMI30, KSE30 with 60s polling
 * 
 * @example
 * const { indices, loading, refresh } = useRealtimeIndices();
 */
export function useRealtimeIndices() {
  return useIndexPrices(['KSE100', 'KMI30', 'KSE30'], {
    autoRefresh: true,
    refreshInterval: 60000,
  });
}

