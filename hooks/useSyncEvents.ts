import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncStatus {
  isRunning: boolean;
  startedAt: string | null;
  lastSync: string | null;
  lastSyncDuration: number | null;
  error: string | null;
}

interface ProgressData {
  total: number;
  completed: number;
  pending: string[];
  failed: string[];
  currentBatch: string[];
}

interface SyncData {
  companies: {
    status: SyncStatus;
    progress: ProgressData;
  };
  dividends: {
    status: SyncStatus;
    progress: ProgressData;
  };
  fundamentals: {
    status: SyncStatus;
    progress: ProgressData;
  };
  lastUpdate: string;
}

export function useSyncEvents() {
  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, statsRes] = await Promise.all([
        fetch('/api/admin/sync/status'),
        fetch('/api/admin/sync/stats')
      ]);

      if (!statusRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch initial data');
      }

      const [statusData, statsData] = await Promise.all([
        statusRes.json(),
        statsRes.json()
      ]);

      // Get detailed progress for each type
      const [companiesProgressRes, dividendsProgressRes, fundamentalsProgressRes] = await Promise.all([
        fetch('/api/admin/sync/progress?type=companies'),
        fetch('/api/admin/sync/progress?type=dividends'),
        fetch('/api/admin/sync/progress?type=fundamentals')
      ]);

      const [companiesProgress, dividendsProgress, fundamentalsProgress] = await Promise.all([
        companiesProgressRes.json(),
        dividendsProgressRes.json(),
        fundamentalsProgressRes.json()
      ]);

      setSyncData({
        companies: {
          status: statusData.companies,
          progress: companiesProgress.progress
        },
        dividends: {
          status: statusData.dividends,
          progress: dividendsProgress.progress
        },
        fundamentals: {
          status: statusData.fundamentals,
          progress: fundamentalsProgress.progress
        },
        lastUpdate: new Date().toISOString()
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect to SSE
  useEffect(() => {
    // Fetch initial data
    fetchInitialData();

    // Setup SSE connection
    const eventSource = new EventSource('/api/admin/sync/events');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection established');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected' || data.type === 'heartbeat') {
          return; // Ignore connection messages
        }

        // Update sync data based on event
        setSyncData(prevData => {
          if (!prevData) return prevData;

          const newData = { ...prevData };
          const targetType = data.type as 'companies' | 'dividends' | 'fundamentals';

          if (data.event === 'status') {
            newData[targetType].status = data.data;
          } else if (data.event === 'progress') {
            newData[targetType].progress = data.data;
          } else if (data.event === 'error') {
            newData[targetType].status.error = data.data.error;
          }

          newData.lastUpdate = data.timestamp;
          return newData;
        });
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setConnected(false);
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        fetchInitialData();
      }, 5000);
    };

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [fetchInitialData]);

  const refetch = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return {
    syncData,
    loading,
    error,
    connected,
    refetch
  };
}

