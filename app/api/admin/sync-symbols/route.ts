import { NextResponse } from 'next/server';
import { populateAllIndicesComposition } from '@/lib/indicesStore';

export async function POST() {
  try {
    console.log('Starting indices symbols sync...');
    const results = await populateAllIndicesComposition();

    // Calculate totals
    let totalIndices = 0;
    let totalSymbols = 0;
    let successCount = 0;
    let failureCount = 0;

    Object.entries(results).forEach(([indexSymbol, result]: [string, { symbolCount: number; symbols: string[]; error?: string }]) => {
      totalIndices++;
      if (result.error) {
        failureCount++;
      } else {
        successCount++;
        totalSymbols += result.symbolCount || 0;
      }
    });

    console.log(`✓ Synced ${successCount}/${totalIndices} indices with ${totalSymbols} total symbols`);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalIndices,
        successCount,
        failureCount,
        totalSymbols
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to sync indices symbols:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync indices symbols',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
