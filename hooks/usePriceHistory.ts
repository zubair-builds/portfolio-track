'use client';

import { useState, useEffect, useCallback } from 'react';

interface PriceData {
  date: string;
  price: number;
  volume?: number;
}

export interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
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
  const [ohlcData, setOhlcData] = useState<OHLCData[]>([]);
  const [allData, setAllData] = useState<PriceData[]>([]); // Store all fetched data
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [checking, setChecking] = useState(true); // Initial check state
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1m');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [dataRange, setDataRange] = useState<DataRange | null>(null);

  const checkExisting = useCallback(async () => {
    if (!symbol) {
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      const response = await fetch(
        `/api/klines/${symbol}?timeframe=${timeframe}&range=1m`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.count > 0) {
          setHasData(true);
          setData(result.data);
          setOhlcData(result.ohlc || []);
          setStats(result.stats);
          setDataRange(result.range);
        } else {
          setHasData(false);
        }
      } else {
        setHasData(false);
      }
    } catch (err) {
      console.error('Error checking existing data:', err);
      setHasData(false);
    } finally {
      setChecking(false);
    }
  }, [symbol, timeframe]);

  // Check if data exists on mount
  useEffect(() => {
    checkExisting();
  }, [symbol, timeframe, checkExisting]);

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
        // The useEffect watching hasData will automatically load data for selectedRange
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
  }, [symbol, timeframe]);

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
      let url = `/api/klines/${symbol}?timeframe=${timeframe}`;
      
      // For custom range, use start and end query parameters
      if (range === 'custom' && customStartDate && customEndDate) {
        const startTimestamp = new Date(customStartDate).getTime();
        const endTimestamp = new Date(customEndDate).getTime();
        url += `&start=${startTimestamp}&end=${endTimestamp}`;
      } else {
        url += `&range=${range}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to load data');
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setOhlcData(result.ohlc || []);
        // Store all data for reference (only for non-custom ranges to avoid overwriting)
        if (range !== 'custom') {
          setAllData(result.data);
        }
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
  }, [symbol, timeframe, hasData, customStartDate, customEndDate]);

  // Load data when range changes (if data exists)
  useEffect(() => {
    if (hasData) {
      loadData(selectedRange);
    }
  }, [selectedRange, hasData, loadData]);

  // Load data when custom dates change (if custom range is selected)
  useEffect(() => {
    if (hasData && selectedRange === 'custom' && customStartDate && customEndDate) {
      loadData('custom');
    }
  }, [customStartDate, customEndDate, hasData, selectedRange, loadData]);

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
    ohlcData,
    loading,
    fetching,
    checking,
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

