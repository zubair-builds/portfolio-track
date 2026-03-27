import { NextResponse } from 'next/server';
import { populateAllIndicesComposition } from '@/lib/indicesStore';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    console.log('Starting indices symbols sync...');
    const results = await populateAllIndicesComposition();

    // Calculate totals
    let totalIndices = 0;
    let totalSymbols = 0;
    let successCount = 0;
    let failureCount = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        error: 'Failed to sync indices symbols'
      },
      { status: 500 }
    );
  }
}
