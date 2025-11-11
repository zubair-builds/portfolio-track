import { NextResponse } from 'next/server';
import { startBackgroundSync } from '@/lib/backgroundSync';

export async function POST(request: Request) {
  try {
    const { type } = await request.json();
    
    if (!type || !['companies', 'dividends', 'fundamentals', 'all'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid sync type. Must be "companies", "dividends", "fundamentals", or "all"' },
        { status: 400 }
      );
    }

    // Start the background sync
    startBackgroundSync(type === 'all' ? ['companies', 'dividends', 'fundamentals'] : [type]);

    return NextResponse.json({
      success: true,
      message: `Background sync started for: ${type}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to start sync:', error);
    return NextResponse.json(
      { error: 'Failed to start background sync' },
      { status: 500 }
    );
  }
}

