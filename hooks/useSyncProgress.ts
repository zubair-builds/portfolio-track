import { useState, useEffect, useCallback, useRef } from 'react';

interface ProgressData {
  total: number;
  completed: number;
  pending: string[];
  failed: string[];
  currentBatch: string[];
}

interface SyncProgressData {
  type: 'companies' | 'dividends';
  progress: ProgressData;
  timestamp: string;
}

const MAX_CONSECUTIVE_FAILURES = 3;

export function useSyncProgress(type: 'companies' | 'dividends', pollingInterval: number = 3000) {
  const [progress, setProgress] = useState<SyncProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const consecutiveFailures = useRef(0);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/sync/progress?type=${type}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sync progress');
      }
      const data = await response.json();
      setProgress(data);
      setError(null);
      consecutiveFailures.current = 0; // Reset on success
    } catch (err) {
      consecutiveFailures.current += 1;
      console.error(`Error fetching sync progress (${consecutiveFailures.current}/${MAX_CONSECUTIVE_FAILURES}):`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchProgress();
    
    // Set up polling only if not too many failures
    const interval = setInterval(() => {
      if (consecutiveFailures.current < MAX_CONSECUTIVE_FAILURES) {
        fetchProgress();
      } else {
        console.warn(`Stopped polling sync progress for ${type} after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
      }
    }, pollingInterval);
    
    return () => clearInterval(interval);
  }, [fetchProgress, pollingInterval, type]);

  return { progress, loading, error, refetch: fetchProgress };
}

/**
 * Hook with conditional polling - only polls when sync is active
 */
export function useSyncProgressConditional(
  type: 'companies' | 'dividends',
  isActive: boolean,
  pollingInterval: number = 3000
) {
  const [progress, setProgress] = useState<SyncProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const consecutiveFailures = useRef(0);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/sync/progress?type=${type}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sync progress');
      }
      const data = await response.json();
      setProgress(data);
      setError(null);
      consecutiveFailures.current = 0;
    } catch (err) {
      consecutiveFailures.current += 1;
      console.error(`Error fetching sync progress (${consecutiveFailures.current}/${MAX_CONSECUTIVE_FAILURES}):`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    // Always fetch once on mount
    fetchProgress();
    
    // Only set up polling if sync is active
    if (!isActive) {
      return;
    }
    
    const interval = setInterval(() => {
      if (consecutiveFailures.current < MAX_CONSECUTIVE_FAILURES) {
        fetchProgress();
      } else {
        console.warn(`Stopped polling sync progress for ${type} after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
      }
    }, pollingInterval);
    
    return () => clearInterval(interval);
  }, [fetchProgress, pollingInterval, type, isActive]);

  return { progress, loading, error, refetch: fetchProgress };
}

