import { NextRequest, NextResponse } from 'next/server';
import { batchGetSymbolMetadata, getSymbolPriceData } from '../../../../lib/symbolsStore';

/**
 * GET /api/symbols/metadata?symbol=SYMBOL
 * Get metadata for a single symbol
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol parameter is required' },
        { status: 400 }
      );
    }

    const data = await getSymbolPriceData(symbol);

    if (!data) {
      return NextResponse.json(
        { error: 'Symbol not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      metadata: {
        symbol: data.symbol,
        name: data.name || '',
        sectorName: data.sectorName || 'Unknown',
        isETF: data.isETF || false,
        isDebt: data.isDebt || false,
        isGEM: data.isGEM || false,
        currentPrice: data.currentPrice,
        priceChange: data.priceChange,
        priceChangePercent: data.priceChangePercent,
        isNonCompliant: data.isNonCompliant || false,
        listedIn: data.listedIn || undefined,
        lastFetchedAt: data.lastFetchedAt || undefined,
        peRatio: data.peRatio,
        pbRatio: data.pbRatio,
        earningsPerShare: data.earningsPerShare,
        dividendYield: data.dividendYield,
        freeFloatPercent: data.freeFloatPercent,
        freeFloatString: data.freeFloatString,
        marketCapString: data.marketCapString,
        volume: data.volume,
      },
    });
  } catch (error) {
    console.error('Error fetching symbol metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symbol metadata' },
      { status: 500 }
    );
  }
}

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
    const metadata: Record<string, unknown> = {};
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
        isNonCompliant: value.isNonCompliant || false,
        listedIn: value.listedIn || undefined,
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

