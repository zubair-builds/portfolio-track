import { NextRequest, NextResponse } from 'next/server';
import { batchGetSymbolMetadata } from '../../../../lib/symbolsStore';

/**
 * API endpoint to fetch symbol metadata in batch
 * POST /api/symbols/metadata
 * Body: { symbols: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'symbols must be an array' },
        { status: 400 }
      );
    }

    const metadataMap = await batchGetSymbolMetadata(symbols);
    
    // Convert Map to object for JSON response
    const metadata: Record<string, any> = {};
    metadataMap.forEach((value, key) => {
      metadata[key] = {
        symbol: value.symbol,
        name: value.name || '',
        sectorName: value.sectorName || 'Unknown',
        isETF: value.isETF || false,
        isDebt: value.isDebt || false,
        isGEM: value.isGEM || false,
        currentPrice: value.currentPrice,
        priceChange: value.priceChange,
        priceChangePercent: value.priceChangePercent,
      };
    });

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error('Error fetching symbol metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symbol metadata' },
      { status: 500 }
    );
  }
}

