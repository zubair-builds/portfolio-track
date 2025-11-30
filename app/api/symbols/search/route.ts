import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import type { Filter } from 'mongodb';
import type { SymbolPriceDocument } from '../../../../lib/symbolsStore';

/**
 * API endpoint to search symbols with pagination
 * GET /api/symbols/search?q=searchTerm&limit=10&offset=0&exclude=SYM1,SYM2
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50
    const offset = parseInt(searchParams.get('offset') || '0');
    const excludeParam = searchParams.get('exclude') || '';
    const excludeSymbols = excludeParam ? excludeParam.split(',').map(s => s.trim().toUpperCase()) : [];

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const collection = db.collection<SymbolPriceDocument>('symbol_prices');

    // Build search filter
    const filter: Filter<SymbolPriceDocument> = {};

    if (query) {
      // Search across symbol, name, and sectorName
      filter.$or = [
        { symbol: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { sectorName: { $regex: query, $options: 'i' } },
      ];
    }

    // Exclude specified symbols
    if (excludeSymbols.length > 0) {
      filter.symbol = { $nin: excludeSymbols };
    }

    // Only include symbols with metadata (exclude bonds/bills without proper data)
    filter.isDebt = { $ne: true };
    filter.name = { $exists: true, $ne: '' };

    // Execute search with pagination
    const [symbols, total] = await Promise.all([
      collection
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
        .skip(offset)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    return NextResponse.json({
      symbols: symbols.map(s => ({
        symbol: s.symbol,
        name: s.name || '',
        sectorName: s.sectorName || 'Unknown',
        isETF: s.isETF || false,
        isDebt: s.isDebt || false,
        isGEM: s.isGEM || false,
        currentPrice: s.currentPrice,
        isNonCompliant: s.isNonCompliant || false,
      })),
      total,
      hasMore: offset + symbols.length < total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error searching symbols:', error);
    return NextResponse.json(
      { error: 'Failed to search symbols' },
      { status: 500 }
    );
  }
}

