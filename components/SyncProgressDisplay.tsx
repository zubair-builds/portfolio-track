'use client';

import { useSyncEvents } from '@/hooks/useSyncEvents';

interface ProgressBarProps {
  progress: number;
  color: string;
}

function ProgressBar({ progress, color }: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-300 ease-out`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
}

interface DetailedProgressProps {
  title: string;
  color: string;
  progress: {
    total: number;
    completed: number;
    pending: string[];
    failed: string[];
    currentBatch: string[];
  };
}

function DetailedProgress({ title, color, progress }: DetailedProgressProps) {
  if (!progress) {
    return null;
  }

  const percentage = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-sm font-semibold text-gray-800">{percentage}%</span>
      </div>
      <ProgressBar progress={percentage} color={color} />
      <div className="flex justify-between text-xs text-gray-600">
        <span>
          Completed: {progress.completed} / {progress.total}
        </span>
        <span className="flex gap-3">
          {progress.pending.length > 0 && (
            <span className="text-yellow-600">
              Pending: {progress.pending.length}
            </span>
          )}
          {progress.failed.length > 0 && (
            <span className="text-red-600">
              Failed: {progress.failed.length}
            </span>
          )}
        </span>
      </div>
      
      {/* Show current batch */}
      {progress.currentBatch.length > 0 && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
          <span className="font-medium text-blue-800">Processing: </span>
          <span className="text-blue-600">
            {progress.currentBatch.slice(0, 5).join(', ')}
            {progress.currentBatch.length > 5 && ` +${progress.currentBatch.length - 5} more`}
          </span>
        </div>
      )}

      {/* Show failed items if any */}
      {progress.failed.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-red-600 hover:text-red-700 font-medium">
            View {progress.failed.length} failed item(s)
          </summary>
          <div className="mt-2 p-2 bg-red-50 rounded text-xs space-y-1 max-h-32 overflow-y-auto">
            {progress.failed.map((symbol, idx) => (
              <div key={idx} className="text-red-700">• {symbol}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default function SyncProgressDisplay() {
  const { syncData, loading, error, connected, refetch } = useSyncEvents();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-red-800">Error loading sync progress: {error}</p>
          <button
            onClick={refetch}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!syncData) {
    return null;
  }

  const companiesRunning = syncData.companies.status.isRunning;
  const dividendsRunning = syncData.dividends.status.isRunning;
  const fundamentalsRunning = syncData.fundamentals.status.isRunning;
  const isAnyActive = companiesRunning || dividendsRunning || fundamentalsRunning;

  // Calculate overall stats
  const totalOperations = syncData.companies.progress.total + syncData.dividends.progress.total + syncData.fundamentals.progress.total;
  const completedOperations = syncData.companies.progress.completed + syncData.dividends.progress.completed + syncData.fundamentals.progress.completed;
  const pendingOperations = syncData.companies.progress.pending.length + syncData.dividends.progress.pending.length + syncData.fundamentals.progress.pending.length;
  const failedOperations = syncData.companies.progress.failed.length + syncData.dividends.progress.failed.length + syncData.fundamentals.progress.failed.length;
  const overallProgress = totalOperations > 0 
    ? Math.round((completedOperations / totalOperations) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Sync Progress</h2>
          {!connected && (
            <span className="text-xs text-orange-600 flex items-center gap-1">
              <span className="animate-pulse">●</span> Reconnecting...
            </span>
          )}
          {connected && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              ● Live
            </span>
          )}
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium mb-1">Total Operations</div>
            <div className="text-2xl font-bold text-blue-900">
              {totalOperations}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-900">
              {completedOperations}
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
            <div className="text-sm text-yellow-600 font-medium mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-900">
              {pendingOperations}
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
            <div className="text-sm text-red-600 font-medium mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-900">
              {failedOperations}
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-semibold text-gray-800">Overall Progress</span>
            <span className="text-lg font-bold text-gray-900">{overallProgress}%</span>
          </div>
          <ProgressBar progress={overallProgress} color="bg-gradient-to-r from-blue-500 to-purple-500" />
        </div>

        {/* Detailed Progress by Type */}
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <DetailedProgress 
              title="Companies Sync" 
              color="bg-blue-600"
              progress={syncData.companies.progress}
            />
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <DetailedProgress 
              title="Dividends Sync" 
              color="bg-purple-600"
              progress={syncData.dividends.progress}
            />
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <DetailedProgress 
              title="Fundamentals Sync" 
              color="bg-orange-600"
              progress={syncData.fundamentals.progress}
            />
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <span>
            {isAnyActive 
              ? '🟢 Real-time updates (via SSE)' 
              : '⚪ Idle (updates on change)'}
          </span>
          <span>Last updated: {new Date(syncData.lastUpdate).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

