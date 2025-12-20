'use client';

import { useState, useEffect, useCallback } from 'react';
import { MutualFundHoldingDocument } from '../lib/mutualFundModel';

export interface MutualFundHolding extends MutualFundHoldingDocument {
  currentNAV?: number;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
}

export function useMutualFundData(userEmail?: string) {
  const [holdings, setHoldings] = useState<MutualFundHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMutualFundData = useCallback(async () => {
    if (!userEmail) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mutual-funds', {
        headers: { 'X-User-Id': userEmail },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch mutual fund holdings');
      }

      const data = await response.json();
      const holdingsWithStats = (data.holdings || []).map((holding: MutualFundHolding) => {
        const gainLoss = holding.currentValue && holding.totalInvested
          ? holding.currentValue - holding.totalInvested
          : undefined;
        const gainLossPercent = gainLoss !== undefined && holding.totalInvested > 0
          ? (gainLoss / holding.totalInvested) * 100
          : undefined;

        return {
          ...holding,
          gainLoss,
          gainLossPercent,
        };
      });

      setHoldings(holdingsWithStats);
    } catch (err) {
      console.error('Error loading mutual fund data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mutual fund data');
      setHoldings([]);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadMutualFundData();
  }, [loadMutualFundData]);

  const refresh = useCallback(async () => {
    await loadMutualFundData();
  }, [loadMutualFundData]);

  return {
    holdings,
    isLoading,
    error,
    refresh,
  };
}


