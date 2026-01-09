'use client';

import { useState, useEffect, useCallback } from 'react';

export function useCashBalance(userEmail?: string) {
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCashBalance = useCallback(async () => {
    if (!userEmail) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cash', {
        headers: { 'X-User-Id': userEmail },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cash balance');
      }

      const data = await response.json();
      setCashBalance(data.availableCash ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cash balance');
      setCashBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchCashBalance();
  }, [fetchCashBalance]);

  const updateCashBalance = useCallback(async (amount: number) => {
    if (!userEmail) {
      throw new Error('User email is required');
    }

    if (amount < 0) {
      throw new Error('Cash balance cannot be negative');
    }

    try {
      const response = await fetch('/api/cash', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userEmail,
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update cash balance');
      }

      const data = await response.json();
      setCashBalance(data.availableCash ?? 0);
      return data.availableCash;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update cash balance');
    }
  }, [userEmail]);

  const refresh = useCallback(() => {
    return fetchCashBalance();
  }, [fetchCashBalance]);

  return {
    cashBalance,
    isLoading,
    error,
    updateCashBalance,
    refresh,
  };
}


