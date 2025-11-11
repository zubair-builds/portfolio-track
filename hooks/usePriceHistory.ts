'use client';

import { useState, useEffect, useCallback } from 'react';

interface PriceData {
  date: string;
  price: number;
  volume?: number;
}

interface Stats {
  high: number;
  low: number;
  first: number;
  last: number;
  change: number;
  changePercent: number;
  avgVolume: number;
}

interface DataRange {
  oldest: Date | null;
  newest: Date | null;
  availableCount: number;
}

export type TimeRange = '1m' | '6m' | '1y' | '5y' | 'custom';

export function usePriceHistory(symbol: string, timeframe: string = '1d') {
  const [data, setData] = useState<PriceData[]>([]);
  const [allData, setAllData] = useState<PriceData[]>([]); // Store all fetched data
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1y');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [dataRange, setDataRange] = useState<DataRange | null>(null);

  // Check if data exists on mount
  useEffect(() => {
    checkExisting();
  }, [symbol, timeframe]);

  // Load data when range changes (if data exists)
  useEffect(() => {
    if (hasData) {
      loadData(selectedRange);
    }
  }, [selectedRange, hasData]);

  const checkExisting = useCallback(async () => {
    if (!symbol) return;

    try {
      const response = await fetch(
        `/api/klines/${symbol}?timeframe=${timeframe}&range=1y`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.count > 0) {
          setHasData(true);
          setData(result.data);
          setStats(result.stats);
          setDataRange(result.range);
        } else {
          setHasData(false);
        }
      }
    } catch (err) {
      console.error('Error checking existing data:', err);
      setHasData(false);
    }
  }, [symbol, timeframe]);

  const fetchAndStore = useCallback(async () => {
    if (!symbol || fetching) return;

    setFetching(true);
    setError(null);

    try {
      const response = await fetch('/api/klines/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          timeframe,
          years: 5,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      if (result.success) {
        setHasData(true);
        // Load the data for the current selected range
        await loadData(selectedRange);
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      throw err;
    } finally {
      setFetching(false);
    }
  }, [symbol, timeframe, selectedRange]);

  const calculateStats = (priceData: PriceData[]): Stats | null => {
    if (priceData.length === 0) return null;

    const prices = priceData.map(d => d.price);
    const volumes = priceData.map(d => d.volume || 0);

    return {
      high: Math.max(...prices),
      low: Math.min(...prices),
      first: prices[0],
      last: prices[prices.length - 1],
      change: prices[prices.length - 1] - prices[0],
      changePercent: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100,
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
    };
  };

  const loadData = useCallback(async (range: TimeRange) => {
    if (!symbol || !hasData) return;

    setLoading(true);
    setError(null);

    try {
      // For custom range, filter from allData
      if (range === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate).getTime();
        const end = new Date(customEndDate).getTime();
        
        const filtered = allData.filter(item => {
          const itemDate = new Date(item.date).getTime();
          return itemDate >= start && itemDate <= end;
        });

        setData(filtered);
        setStats(calculateStats(filtered));
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/klines/${symbol}?timeframe=${timeframe}&range=${range}`
      );

      if (!response.ok) {
        throw new Error('Failed to load data');
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setAllData(result.data); // Store for custom filtering
        setStats(result.stats);
        setDataRange(result.range);
      } else {
        throw new Error(result.error || 'Failed to load data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, hasData, customStartDate, customEndDate, allData]);

  const refresh = useCallback(async () => {
    if (hasData) {
      await loadData(selectedRange);
    } else {
      await fetchAndStore();
    }
  }, [hasData, selectedRange, loadData, fetchAndStore]);

  const applyCustomRange = useCallback((startDate: string, endDate: string) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    setSelectedRange('custom');
  }, []);

  return {
    data,
    loading,
    fetching,
    error,
    hasData,
    selectedRange,
    setSelectedRange,
    customStartDate,
    customEndDate,
    applyCustomRange,
    stats,
    dataRange,
    fetchAndStore,
    loadData,
    refresh,
  };
}

