'use client';

import { useState } from 'react';

interface SyncStatus {
  isRunning: boolean;
  startedAt: string | null;
  lastSync: string | null;
  lastSyncDuration: number | null;
  error: string | null;
}

interface SyncControlPanelProps {
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  companiesStatus: SyncStatus | null;
  dividendsStatus: SyncStatus | null;
  fundamentalsStatus: SyncStatus | null;
  loading?: boolean;
  error?: string | null;
}

// Helper function to format duration
function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export default function SyncControlPanel({ 
  onNotification, 
  companiesStatus, 
  dividendsStatus,
  fundamentalsStatus,
  loading = false,
  error = null
}: SyncControlPanelProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleStartSync = async (type: 'companies' | 'dividends' | 'fundamentals' | 'all') => {
    setActionLoading(`start-${type}`);
    try {
      const response = await fetch('/api/admin/sync/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }

      const data = await response.json();
      onNotification?.(data.message, 'success');
      // SSE will handle the update automatically
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start sync';
      onNotification?.(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopSync = async (type: 'companies' | 'dividends' | 'fundamentals' | 'all') => {
    setActionLoading(`stop-${type}`);
    try {
      const response = await fetch('/api/admin/sync/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (!response.ok) {
        throw new Error('Failed to stop sync');
      }

      const data = await response.json();
      onNotification?.(data.message, 'success');
      // SSE will handle the update automatically
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop sync';
      onNotification?.(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (type: 'companies' | 'dividends' | 'fundamentals') => {
    setActionLoading(`retry-${type}`);
    try {
      const response = await fetch('/api/admin/sync/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (!response.ok) {
        throw new Error('Failed to retry');
      }

      const data = await response.json();
      onNotification?.(data.message, 'success');
      // SSE will handle the update automatically
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry failed items';
      onNotification?.(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncIndicesSymbols = async () => {
    setActionLoading('sync-indices');
    try {
      const response = await fetch('/api/admin/sync-symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to sync indices symbols');
      }

      const data = await response.json();
      
      if (data.success && data.summary) {
        const { successCount, totalIndices, totalSymbols } = data.summary;
        onNotification?.(
          `Successfully synced ${successCount}/${totalIndices} indices with ${totalSymbols} total symbols`,
          'success'
        );
      } else {
        throw new Error(data.message || 'Failed to sync indices symbols');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync indices symbols';
      onNotification?.(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading sync controls: {error}</p>
        </div>
      </div>
    );
  }

  const companiesRunning = companiesStatus?.isRunning || false;
  const dividendsRunning = dividendsStatus?.isRunning || false;
  const fundamentalsRunning = fundamentalsStatus?.isRunning || false;
  const anyRunning = companiesRunning || dividendsRunning || fundamentalsRunning;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Sync Control Panel</h2>
        
        {/* Main Actions */}
        <div className="space-y-4">
          {/* Start All */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Sync All Data</h3>
                <p className="text-sm text-gray-600">Start syncing companies, dividends, and fundamentals</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartSync('all')}
                  disabled={anyRunning || actionLoading === 'start-all'}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'start-all' ? 'Starting...' : 'Start All'}
                </button>
                <button
                  onClick={() => handleStopSync('all')}
                  disabled={!anyRunning || actionLoading === 'stop-all'}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'stop-all' ? 'Stopping...' : 'Stop All'}
                </button>
              </div>
            </div>
          </div>

          {/* Companies Sync */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">Companies Data</h3>
                  {companiesRunning && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Running
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Sync fundamental company data
                  {companiesStatus?.lastSync && (
                    <span className="ml-2 text-gray-500">
                      Last: {new Date(companiesStatus.lastSync).toLocaleString()}
                      {companiesStatus.lastSyncDuration && ` (took ${formatDuration(companiesStatus.lastSyncDuration)})`}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartSync('companies')}
                  disabled={companiesRunning || actionLoading === 'start-companies'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'start-companies' ? 'Starting...' : 'Start'}
                </button>
                <button
                  onClick={() => handleStopSync('companies')}
                  disabled={!companiesRunning || actionLoading === 'stop-companies'}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'stop-companies' ? 'Stopping...' : 'Stop'}
                </button>
                <button
                  onClick={() => handleRetry('companies')}
                  disabled={companiesRunning || actionLoading === 'retry-companies'}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'retry-companies' ? 'Retrying...' : 'Retry Failed'}
                </button>
              </div>
            </div>
          </div>

          {/* Dividends Sync */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">Dividends Data</h3>
                  {dividendsRunning && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Running
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Sync dividend history data
                  {dividendsStatus?.lastSync && (
                    <span className="ml-2 text-gray-500">
                      Last: {new Date(dividendsStatus.lastSync).toLocaleString()}
                      {dividendsStatus.lastSyncDuration && ` (took ${formatDuration(dividendsStatus.lastSyncDuration)})`}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartSync('dividends')}
                  disabled={dividendsRunning || actionLoading === 'start-dividends'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'start-dividends' ? 'Starting...' : 'Start'}
                </button>
                <button
                  onClick={() => handleStopSync('dividends')}
                  disabled={!dividendsRunning || actionLoading === 'stop-dividends'}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'stop-dividends' ? 'Stopping...' : 'Stop'}
                </button>
                <button
                  onClick={() => handleRetry('dividends')}
                  disabled={dividendsRunning || actionLoading === 'retry-dividends'}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'retry-dividends' ? 'Retrying...' : 'Retry Failed'}
                </button>
              </div>
            </div>
          </div>

          {/* Fundamentals Sync */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">Fundamentals Data</h3>
                  {fundamentalsRunning && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Running
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Sync fundamentals (sector, listedIn, PE ratio, etc.)
                  {fundamentalsStatus?.lastSync && (
                    <span className="ml-2 text-gray-500">
                      Last: {new Date(fundamentalsStatus.lastSync).toLocaleString()}
                      {fundamentalsStatus.lastSyncDuration && ` (took ${formatDuration(fundamentalsStatus.lastSyncDuration)})`}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartSync('fundamentals')}
                  disabled={fundamentalsRunning || actionLoading === 'start-fundamentals'}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'start-fundamentals' ? 'Starting...' : 'Start'}
                </button>
                <button
                  onClick={() => handleStopSync('fundamentals')}
                  disabled={!fundamentalsRunning || actionLoading === 'stop-fundamentals'}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'stop-fundamentals' ? 'Stopping...' : 'Stop'}
                </button>
                <button
                  onClick={() => handleRetry('fundamentals')}
                  disabled={fundamentalsRunning || actionLoading === 'retry-fundamentals'}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'retry-fundamentals' ? 'Retrying...' : 'Retry Failed'}
                </button>
              </div>
            </div>
          </div>

          {/* Indices Symbols Sync */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-teal-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">Indices Symbols</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full">
                    One-time
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Populate indices symbols from symbol_prices listedIn field
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Updates all indices at once by parsing which symbols are listed in each index
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSyncIndicesSymbols}
                  disabled={anyRunning || actionLoading === 'sync-indices'}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'sync-indices' ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

