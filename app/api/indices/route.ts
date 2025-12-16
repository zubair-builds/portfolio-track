import { NextResponse } from 'next/server';
import { getAllIndices } from '../../../lib/indicesStore';

/**
 * GET /api/indices
 * Returns all indices with their latest prices
 * Fast query (single collection read with denormalized latestPrice)
 */
export async function GET() {
  try {
    const indices = await getAllIndices();

    return NextResponse.json({
      indices: indices.map(idx => ({
        symbol: idx.symbol,
        name: idx.name,
        description: idx.description,
        symbolCount: idx.symbolCount,
        updateFrequency: idx.updateFrequency,
        latestPrice: idx.latestPrice,
        lastUpdated: idx.lastUpdated,
      })),
      count: indices.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching indices:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to fetch indices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

