import { NextResponse } from 'next/server';
import { retryFailed } from '@/lib/syncProgressStore';
import { startBackgroundSync } from '@/lib/backgroundSync';

export async function POST(request: Request) {
  try {
    const { type } = await request.json();
    
    if (!type || !['companies', 'dividends', 'fundamentals'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid sync type. Must be "companies", "dividends", or "fundamentals"' },
        { status: 400 }
      );
    }

    // Reset failed items to pending
    const retriedCount = await retryFailed(type);

    if (retriedCount > 0) {
      // Restart the sync to process the retried items
      startBackgroundSync([type]);
    }

    return NextResponse.json({
      success: true,
      retriedCount,
      message: `Retrying ${retriedCount} failed items for ${type}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to retry:', error);
    return NextResponse.json(
      { error: 'Failed to retry failed items' },
      { status: 500 }
    );
  }
}

