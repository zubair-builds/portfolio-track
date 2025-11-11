import { useState, useEffect, useCallback, useRef } from 'react';

interface TypeStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  progress: number;
  isRunning: boolean;
  lastSync: string | null;
}

interface SyncStats {
  companies: TypeStats;
  dividends: TypeStats;
  overall: {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    pendingOperations: number;
    overallProgress: number;
  };
  timestamp: string;
}

const MAX_CONSECUTIVE_FAILURES = 3;

export function useSyncStats(pollingInterval: number = 5000) {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const consecutiveFailures = useRef(0);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sync/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch sync stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
      consecutiveFailures.current = 0; // Reset on success
    } catch (err) {
      consecutiveFailures.current += 1;
      console.error(`Error fetching sync stats (${consecutiveFailures.current}/${MAX_CONSECUTIVE_FAILURES}):`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    // Set up polling only if not too many failures
    const interval = setInterval(() => {
      if (consecutiveFailures.current < MAX_CONSECUTIVE_FAILURES) {
        fetchStats();
      } else {
        console.warn(`Stopped polling sync stats after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
      }
    }, pollingInterval);
    
    return () => clearInterval(interval);
  }, [fetchStats, pollingInterval]);

  return { stats, loading, error, refetch: fetchStats };
}

/**
 * Hook with conditional polling - only polls when any sync is active
 */
export function useSyncStatsConditional(isAnyActive: boolean, pollingInterval: number = 5000) {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const consecutiveFailures = useRef(0);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sync/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch sync stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
      consecutiveFailures.current = 0;
    } catch (err) {
      consecutiveFailures.current += 1;
      console.error(`Error fetching sync stats (${consecutiveFailures.current}/${MAX_CONSECUTIVE_FAILURES}):`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Always fetch once on mount
    fetchStats();
    
    // Only set up polling if any sync is active
    if (!isAnyActive) {
      return;
    }
    
    const interval = setInterval(() => {
      if (consecutiveFailures.current < MAX_CONSECUTIVE_FAILURES) {
        fetchStats();
      } else {
        console.warn(`Stopped polling sync stats after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
      }
    }, pollingInterval);
    
    return () => clearInterval(interval);
  }, [fetchStats, pollingInterval, isAnyActive]);

  return { stats, loading, error, refetch: fetchStats };
}

