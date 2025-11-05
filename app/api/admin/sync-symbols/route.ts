import { NextResponse } from 'next/server';
import { syncSymbolsFromStaticData } from '../../../../lib/symbolsStore';

/**
 * API endpoint to sync symbols from static data (lib/symbols.ts) to MongoDB
 * POST /api/admin/sync-symbols
 * 
 * This endpoint:
 * - Updates existing symbols with name, sectorName, isETF, isDebt, isGEM
 * - Creates new symbols with metadata + null price fields
 * - Returns summary of operations
 */
export async function POST() {
  try {
    const result = await syncSymbolsFromStaticData();

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.total} symbols`,
      data: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('Error syncing symbols:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to sync symbols',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check sync status
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/sync-symbols',
    method: 'POST',
    description: 'Sync symbols from lib/symbols.ts to MongoDB',
    usage: 'Send a POST request to this endpoint to trigger the sync',
  });
}

