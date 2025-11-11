'use client';

import { useState, useEffect, useCallback } from 'react';

interface FreeFloatRecord {
  date: string;
  freeFloat: number;
  freeFloatPercent: number;
  shares: number;
}

export function useFreeFloatHistory(symbol?: string, limit: number = 10) {
  const [history, setHistory] = useState<FreeFloatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const response = await fetch(
        `/api/companies/${encodeURIComponent(symbol)}/freefloat-history?limit=${limit}`
      );

      if (response.status === 404) {
        setHistory([]);
        setError(`No free float history found for ${symbol}`);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.history) {
        setHistory(data.history);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching free float history:', err);
      setError('Failed to load free float history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, limit]);

  useEffect(() => {
    if (symbol) {
      fetchHistory();
    }
  }, [symbol, fetchHistory]);

  return {
    history,
    loading,
    error,
    refresh: fetchHistory,
  };
}

