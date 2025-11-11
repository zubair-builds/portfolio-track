import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncStatus {
  isRunning: boolean;
  startedAt: string | null;
  lastSync: string | null;
  lastSyncDuration: number | null;
  error: string | null;
}

interface SyncStatusData {
  companies: SyncStatus;
  dividends: SyncStatus;
  fundamentals: SyncStatus;
  timestamp: string;
}

const MAX_CONSECUTIVE_FAILURES = 3;

export function useSyncStatus(pollingInterval: number = 5000) {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const consecutiveFailures = useRef(0);
  const [dynamicInterval, setDynamicInterval] = useState(pollingInterval);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sync/status');
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
      consecutiveFailures.current = 0; // Reset on success
      
      // Adjust polling interval based on activity
      const isAnyActive = data.companies.isRunning || data.dividends.isRunning || data.fundamentals.isRunning;
      if (isAnyActive) {
        // Fast polling when active
        setDynamicInterval(5000);
      } else {
        // Slow polling when idle
        setDynamicInterval(30000); // 30 seconds
      }
    } catch (err) {
      consecutiveFailures.current += 1;
      console.error(`Error fetching sync status (${consecutiveFailures.current}/${MAX_CONSECUTIVE_FAILURES}):`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    
    // Set up polling with dynamic interval
    const interval = setInterval(() => {
      if (consecutiveFailures.current < MAX_CONSECUTIVE_FAILURES) {
        fetchStatus();
      } else {
        console.warn(`Stopped polling sync status after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
      }
    }, dynamicInterval);
    
    return () => clearInterval(interval);
  }, [fetchStatus, dynamicInterval]);

  return { status, loading, error, refetch: fetchStatus };
}

