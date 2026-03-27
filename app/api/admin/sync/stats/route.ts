import { NextResponse } from 'next/server';
import { getProgress, getSyncStatus } from '@/lib/syncProgressStore';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const [companiesProgress, dividendsProgress, fundamentalsProgress, companiesStatus, dividendsStatus, fundamentalsStatus] = await Promise.all([
      getProgress('companies'),
      getProgress('dividends'),
      getProgress('fundamentals'),
      getSyncStatus('companies'),
      getSyncStatus('dividends'),
      getSyncStatus('fundamentals')
    ]);

    // Calculate aggregate statistics
    const stats = {
      companies: {
        total: companiesProgress.total,
        completed: companiesProgress.completed,
        failed: companiesProgress.failed.length,
        pending: companiesProgress.pending.length,
        progress: companiesProgress.total > 0 
          ? Math.round((companiesProgress.completed / companiesProgress.total) * 100) 
          : 0,
        isRunning: companiesStatus.isRunning,
        lastSync: companiesStatus.lastSync,
        lastSyncDuration: companiesStatus.lastSyncDuration
      },
      dividends: {
        total: dividendsProgress.total,
        completed: dividendsProgress.completed,
        failed: dividendsProgress.failed.length,
        pending: dividendsProgress.pending.length,
        progress: dividendsProgress.total > 0 
          ? Math.round((dividendsProgress.completed / dividendsProgress.total) * 100) 
          : 0,
        isRunning: dividendsStatus.isRunning,
        lastSync: dividendsStatus.lastSync,
        lastSyncDuration: dividendsStatus.lastSyncDuration
      },
      fundamentals: {
        total: fundamentalsProgress.total,
        completed: fundamentalsProgress.completed,
        failed: fundamentalsProgress.failed.length,
        pending: fundamentalsProgress.pending.length,
        progress: fundamentalsProgress.total > 0 
          ? Math.round((fundamentalsProgress.completed / fundamentalsProgress.total) * 100) 
          : 0,
        isRunning: fundamentalsStatus.isRunning,
        lastSync: fundamentalsStatus.lastSync,
        lastSyncDuration: fundamentalsStatus.lastSyncDuration
      },
      overall: {
        totalOperations: companiesProgress.total + dividendsProgress.total + fundamentalsProgress.total,
        completedOperations: companiesProgress.completed + dividendsProgress.completed + fundamentalsProgress.completed,
        failedOperations: companiesProgress.failed.length + dividendsProgress.failed.length + fundamentalsProgress.failed.length,
        pendingOperations: companiesProgress.pending.length + dividendsProgress.pending.length + fundamentalsProgress.pending.length,
        overallProgress: 
          (companiesProgress.total + dividendsProgress.total + fundamentalsProgress.total) > 0
            ? Math.round(
                ((companiesProgress.completed + dividendsProgress.completed + fundamentalsProgress.completed) / 
                (companiesProgress.total + dividendsProgress.total + fundamentalsProgress.total)) * 100
              )
            : 0
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get sync stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sync statistics' },
      { status: 500 }
    );
  }
}

