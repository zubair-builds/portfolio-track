import { NextRequest, NextResponse } from 'next/server';
import { getIndexMetadata } from '../../../../lib/indicesStore';

/**
 * GET /api/indices/{symbol}
 * Returns specific index with metadata and latest price
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol;
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Index symbol is required' },
        { status: 400 }
      );
    }

    const index = await getIndexMetadata(symbol);

    if (!index) {
      return NextResponse.json(
        { error: `Index ${symbol} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      index: {
        symbol: index.symbol,
        name: index.name,
        description: index.description,
        symbolCount: index.symbolCount,
        symbols: index.symbols,
        updateFrequency: index.updateFrequency,
        latestPrice: index.latestPrice,
        lastUpdated: index.lastUpdated,
      },
    });
  } catch (error) {
    console.error('Error fetching index:', error);
    return NextResponse.json(
      { error: 'Failed to fetch index' },
      { status: 500 }
    );
  }
}

