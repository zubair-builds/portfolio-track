import { NextResponse } from 'next/server';
import { getSymbolPriceStats } from '../../../../lib/symbolsStore';

/**
 * GET /api/symbols/stats
 * Returns statistics about cached symbol prices in the database
 */
export async function GET() {
  try {
    const stats = await getSymbolPriceStats();
    
    return NextResponse.json({
      success: true,
      stats: {
        totalSymbols: stats.totalSymbols,
        oldestCache: stats.oldestCache ? stats.oldestCache.getTime() : null,
        latestCache: stats.latestCache ? stats.latestCache.getTime() : null,
      },
    });
  } catch (error) {
    console.error('Error fetching symbol price stats:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

