/**
 * Sync Progress Store
 * 
 * Manages sync session progress tracking in MongoDB.
 * Used by admin dashboard to monitor background sync operations.
 */

import clientPromise from './mongodb';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type SyncType = 'companies' | 'dividends' | 'fundamentals' | 'indices' | 'symbols';
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
  successCount: number;
  failedCount: number;
  estimatedTimeRemaining?: number; // seconds
}

export interface SyncSession {
  sessionId: string;
  type: SyncType;
  status: SyncStatus;
  progress: SyncProgress;
  startTime: Date;
  endTime?: Date;
  error?: string;
  results?: {
    processed: number;
    successful: number;
    failed: number;
    failedItems?: string[];
  };
  options?: Record<string, any>; // batchSize, symbols, etc.
}

interface ProgressDocument {
  _id: string;
  total: number;
  completed: number;
  pending: string[];
  failed: string[];
  currentBatch: string[];
}

interface StatusDocument {
  _id: string;
  isRunning: boolean;
  startedAt: string | null;
  lastSync: string | null;
  lastSyncDuration: number | null;
  error: string | null;
}

// ============================================================================
// Session Management Functions
// ============================================================================

/**
 * Create a new sync session
 */
export async function createSession(
  type: SyncType,
  options?: Record<string, any>
): Promise<string> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection<SyncSession>('sync_sessions');

    const sessionId = generateSessionId();

    const session: SyncSession = {
      sessionId,
      type,
      status: 'pending',
      progress: {
        current: 0,
        total: options?.batchSize || 0,
        percentage: 0,
        successCount: 0,
        failedCount: 0,
      },
      startTime: new Date(),
      options,
    };

    await sessions.insertOne(session as any);

    console.log(`✓ Created sync session: ${sessionId} (${type})`);

    return sessionId;
  } catch (error) {
    console.error('Error creating sync session:', error);
    throw error;
  }
}

/**
 * Update session progress
 */
export async function updateProgress(
  sessionId: string,
  progress: Partial<SyncProgress>,
  status?: SyncStatus
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection<SyncSession>('sync_sessions');

    const updateData: any = {
      'progress.current': progress.current,
      'progress.percentage': progress.percentage,
      'progress.successCount': progress.successCount,
      'progress.failedCount': progress.failedCount,
    };

    if (progress.currentItem) {
      updateData['progress.currentItem'] = progress.currentItem;
    }

    if (progress.estimatedTimeRemaining !== undefined) {
      updateData['progress.estimatedTimeRemaining'] = progress.estimatedTimeRemaining;
    }

    if (progress.total !== undefined) {
      updateData['progress.total'] = progress.total;
    }

    if (status) {
      updateData.status = status;
    }

    await sessions.updateOne(
      { sessionId },
      { $set: updateData }
    );
  } catch (error) {
    console.error(`Error updating session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Get session progress by session ID
 */
export async function getSessionProgress(sessionId: string): Promise<SyncSession | null> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection<SyncSession>('sync_sessions');

    const session = await sessions.findOne({ sessionId });

    return session;
  } catch (error) {
    console.error(`Error getting session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Get progress by sync type (for admin dashboard)
 * Returns aggregated progress for all items of a specific type
 */
export async function getProgress(type: 'companies' | 'dividends' | 'fundamentals'): Promise<{
  total: number;
  completed: number;
  pending: string[];
  failed: string[];
  currentBatch: string[];
}> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const progressCollection = db.collection<ProgressDocument>(`${type}_progress`);

    // Get or create progress document
    let progress = await progressCollection.findOne({ _id: 'progress' });
    
    if (!progress) {
      // Initialize if doesn't exist
      const initialProgress: ProgressDocument = {
        _id: 'progress',
        total: 0,
        completed: 0,
        pending: [],
        failed: [],
        currentBatch: []
      };
      await progressCollection.insertOne(initialProgress);
      progress = initialProgress;
    }

    return {
      total: progress.total || 0,
      completed: progress.completed || 0,
      pending: progress.pending || [],
      failed: progress.failed || [],
      currentBatch: progress.currentBatch || []
    };
  } catch (error) {
    console.error(`Error getting progress for ${type}:`, error);
    // Return default values instead of throwing
    return {
      total: 0,
      completed: 0,
      pending: [],
      failed: [],
      currentBatch: []
    };
  }
}

/**
 * Get sync status by type (for admin dashboard)
 */
export async function getSyncStatus(type: 'companies' | 'dividends' | 'fundamentals'): Promise<{
  isRunning: boolean;
  startedAt: string | null;
  lastSync: string | null;
  lastSyncDuration: number | null;
  error: string | null;
}> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const statusCollection = db.collection<StatusDocument>(`${type}_sync_status`);

    // Get or create status document
    let status = await statusCollection.findOne({ _id: 'status' });
    
    if (!status) {
      // Initialize if doesn't exist
      const initialStatus: StatusDocument = {
        _id: 'status',
        isRunning: false,
        startedAt: null,
        lastSync: null,
        lastSyncDuration: null,
        error: null
      };
      await statusCollection.insertOne(initialStatus);
      status = initialStatus;
    }

    return {
      isRunning: status.isRunning || false,
      startedAt: status.startedAt || null,
      lastSync: status.lastSync || null,
      lastSyncDuration: status.lastSyncDuration || null,
      error: status.error || null
    };
  } catch (error) {
    console.error(`Error getting sync status for ${type}:`, error);
    // Return default values instead of throwing
    return {
      isRunning: false,
      startedAt: null,
      lastSync: null,
      lastSyncDuration: null,
      error: null
    };
  }
}

/**
 * Update progress by sync type
 */
export async function updateProgressByType(
  type: 'companies' | 'dividends' | 'fundamentals',
  updates: {
    total?: number;
    completed?: number;
    pending?: string[];
    failed?: string[];
    currentBatch?: string[];
  }
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const progressCollection = db.collection<ProgressDocument>(`${type}_progress`);

    await progressCollection.updateOne(
      { _id: 'progress' },
      { $set: updates },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Error updating progress for ${type}:`, error);
    throw error;
  }
}

/**
 * Update sync status by type
 */
export async function updateSyncStatus(
  type: 'companies' | 'dividends' | 'fundamentals',
  updates: {
    isRunning?: boolean;
    startedAt?: string | null;
    lastSync?: string | null;
    lastSyncDuration?: number | null;
    error?: string | null;
  }
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const statusCollection = db.collection<StatusDocument>(`${type}_sync_status`);

    await statusCollection.updateOne(
      { _id: 'status' },
      { $set: updates },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Error updating sync status for ${type}:`, error);
    throw error;
  }
}

/**
 * Retry failed items - moves them from failed back to pending
 */
export async function retryFailed(type: 'companies' | 'dividends' | 'fundamentals'): Promise<number> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const progressCollection = db.collection<ProgressDocument>(`${type}_progress`);

    // Get current progress
    const progress = await progressCollection.findOne({ _id: 'progress' });
    
    if (!progress || !progress.failed || progress.failed.length === 0) {
      return 0;
    }

    const failedItems = progress.failed;
    const retriedCount = failedItems.length;

    // Move failed items back to pending
    await progressCollection.updateOne(
      { _id: 'progress' },
      {
        $set: {
          pending: [...(progress.pending || []), ...failedItems],
          failed: []
        }
      }
    );

    console.log(`✓ Retrying ${retriedCount} failed items for ${type}`);
    return retriedCount;
  } catch (error) {
    console.error(`Error retrying failed items for ${type}:`, error);
    throw error;
  }
}

/**
 * Complete a sync session
 */
export async function completeSession(
  sessionId: string,
  status: 'completed' | 'failed',
  results?: {
    processed: number;
    successful: number;
    failed: number;
    failedItems?: string[];
  },
  error?: string
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection<SyncSession>('sync_sessions');

    const updateData: any = {
      status,
      endTime: new Date(),
    };

    if (results) {
      updateData.results = results;
      updateData['progress.percentage'] = 100;
    }

    if (error) {
      updateData.error = error;
    }

    await sessions.updateOne(
      { sessionId },
      { $set: updateData }
    );

    console.log(`✓ Completed sync session: ${sessionId} (${status})`);
  } catch (error) {
    console.error(`Error completing session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Cancel a sync session
 */
export async function cancelSession(sessionId: string): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection<SyncSession>('sync_sessions');

    await sessions.updateOne(
      { sessionId },
      {
        $set: {
          status: 'cancelled',
          endTime: new Date(),
        },
      }
    );

    console.log(`✓ Cancelled sync session: ${sessionId}`);
  } catch (error) {
    console.error(`Error cancelling session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Get recent sessions (for history panel)
 */
export async function getRecentSessions(limit: number = 10): Promise<SyncSession[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection<SyncSession>('sync_sessions');

    const recentSessions = await sessions
      .find({})
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();

    return recentSessions;
  } catch (error) {
    console.error('Error getting recent sessions:', error);
    throw error;
  }
}

/**
 * Get active sessions
 */
export async function getActiveSessions(): Promise<SyncSession[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection<SyncSession>('sync_sessions');

    const activeSessions = await sessions
      .find({
        status: { $in: ['pending', 'running'] },
      })
      .toArray();

    return activeSessions;
  } catch (error) {
    console.error('Error getting active sessions:', error);
    throw error;
  }
}

/**
 * Clean up old sessions (called periodically or manually)
 */
export async function cleanupOldSessions(olderThanHours: number = 24): Promise<number> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection<SyncSession>('sync_sessions');

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const result = await sessions.deleteMany({
      startTime: { $lt: cutoffDate },
      status: { $in: ['completed', 'failed', 'cancelled'] },
    });

    console.log(`✓ Cleaned up ${result.deletedCount} old sessions`);

    return result.deletedCount || 0;
  } catch (error) {
    console.error('Error cleaning up old sessions:', error);
    throw error;
  }
}

/**
 * Delete a specific session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection<SyncSession>('sync_sessions');

    await sessions.deleteOne({ sessionId });

    console.log(`✓ Deleted sync session: ${sessionId}`);
  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
    throw error;
  }
}

// ============================================================================
// Index Management
// ============================================================================

/**
 * Ensure MongoDB indexes for sync_sessions collection
 */
export async function ensureSyncSessionIndexes(): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const sessions = db.collection('sync_sessions');

    // Primary key index
    await sessions.createIndex({ sessionId: 1 }, { unique: true });

    // Query indexes
    await sessions.createIndex({ status: 1 });
    await sessions.createIndex({ type: 1 });
    await sessions.createIndex({ startTime: -1 });

    // TTL index - auto-delete completed sessions after 24 hours
    await sessions.createIndex(
      { startTime: 1 },
      {
        expireAfterSeconds: 86400, // 24 hours
        partialFilterExpression: {
          status: { $in: ['completed', 'failed', 'cancelled'] },
        },
      }
    );

    console.log('✓ Sync session indexes ensured');
  } catch (error) {
    console.error('Error ensuring sync session indexes:', error);
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: timestamp + random string
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate ETA based on average time per item
 */
export function calculateETA(
  current: number,
  total: number,
  elapsedMs: number
): number {
  if (current === 0) return 0;

  const avgTimePerItem = elapsedMs / current;
  const remaining = total - current;
  const etaMs = remaining * avgTimePerItem;

  return Math.round(etaMs / 1000); // Convert to seconds
}

