'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DividendStats {
  totalNet: number;
  totalGross: number;
  totalTax: number;
  totalZakat: number;
  count: number;
  bySymbol?: Array<{
    symbol: string;
    netDividend: number;
    grossDividend: number;
    taxDeducted: number;
    zakatDeducted: number;
    count: number;
    lastPayment: Date;
  }>;
}

export interface DividendDataOptions {
  includeBySymbol?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export function useDividendData(userEmail?: string, options?: DividendDataOptions) {
  const [dividendStats, setDividendStats] = useState<DividendStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDividendData = useCallback(async () => {
    if (!userEmail) {
      setDividendStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.includeBySymbol) params.append('includeBySymbol', 'true');
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());

      const url = `/api/dividends/stats${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: { 'X-User-Id': userEmail },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dividend data: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.stats) {
        setDividendStats({
          totalNet: data.stats.totalNet || 0,
          totalGross: data.stats.totalGross || 0,
          totalTax: data.stats.totalTax || 0,
          totalZakat: data.stats.totalZakat || 0,
          count: data.stats.count || 0,
          bySymbol: data.stats.bySymbol,
        });
      } else {
        setDividendStats({
          totalNet: 0,
          totalGross: 0,
          totalTax: 0,
          totalZakat: 0,
          count: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching dividend data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dividend data');
      setDividendStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, options?.includeBySymbol, options?.startDate, options?.endDate]);

  useEffect(() => {
    fetchDividendData();
  }, [fetchDividendData]);

  return {
    dividendStats,
    isLoading,
    error,
    refresh: fetchDividendData,
  };
}
