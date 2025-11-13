import { NextRequest, NextResponse } from 'next/server';
import { getSymbolPriceData } from '../../../../../lib/symbolsStore';
import clientPromise from '../../../../../lib/mongodb';

/**
 * API endpoint to get sector peers for a symbol
 * GET /api/symbols/[symbol]/sector-peers
 * Returns all symbols in the same sector, excluding the input symbol
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const resolvedParams = await params;
    const symbol = resolvedParams.symbol?.toUpperCase();

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Get the symbol's data to find its sector
    const symbolData = await getSymbolPriceData(symbol);

    if (!symbolData) {
      return NextResponse.json(
        { error: 'Symbol not found' },
        { status: 404 }
      );
    }

    const sectorName = symbolData.sectorName;

    if (!sectorName) {
      return NextResponse.json({
        symbol,
        sectorName: null,
        peers: [],
        count: 0,
      });
    }

    // Query for all symbols in the same sector, excluding the input symbol
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const collection = db.collection('symbol_prices');

    const filter: any = {
      sectorName: { $regex: `^${sectorName}$`, $options: 'i' }, // Exact match, case-insensitive
      symbol: { $ne: symbol }, // Exclude the input symbol
      isDebt: { $ne: true }, // Exclude debt instruments
      name: { $exists: true, $ne: '' }, // Only include symbols with names
    };

    const peers = await collection
      .find(filter)
      .project({
        symbol: 1,
        name: 1,
        sectorName: 1,
        isETF: 1,
        isDebt: 1,
        isGEM: 1,
        currentPrice: 1,
        isNonCompliant: 1,
      })
      .sort({ symbol: 1 }) // Sort alphabetically
      .toArray();

    return NextResponse.json({
      symbol,
      sectorName,
      peers: peers.map((p) => ({
        symbol: p.symbol,
        name: p.name || '',
        sectorName: p.sectorName || 'Unknown',
        isETF: p.isETF || false,
        isDebt: p.isDebt || false,
        isGEM: p.isGEM || false,
        currentPrice: p.currentPrice,
        isNonCompliant: p.isNonCompliant || false,
      })),
      count: peers.length,
    });
  } catch (error) {
    console.error('Error fetching sector peers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sector peers' },
      { status: 500 }
    );
  }
}

