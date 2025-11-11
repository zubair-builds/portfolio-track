import { NextResponse } from 'next/server';
import { stopBackgroundSync } from '@/lib/backgroundSync';

export async function POST(request: Request) {
  try {
    const { type } = await request.json();
    
    if (!type || !['companies', 'dividends', 'fundamentals', 'all'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid sync type. Must be "companies", "dividends", "fundamentals", or "all"' },
        { status: 400 }
      );
    }

    // Stop the background sync
    stopBackgroundSync(type === 'all' ? ['companies', 'dividends', 'fundamentals'] : [type]);

    return NextResponse.json({
      success: true,
      message: `Background sync stopped for: ${type}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to stop sync:', error);
    return NextResponse.json(
      { error: 'Failed to stop background sync' },
      { status: 500 }
    );
  }
}

