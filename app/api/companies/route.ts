import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

/**
 * API endpoint to list companies with filtering and pagination
 * GET /api/companies?q=searchTerm&index=KSE100&sector=Technology&shariah=compliant&limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const index = searchParams.get('index') || '';
    const sector = searchParams.get('sector') || '';
    const shariah = searchParams.get('shariah') || ''; // 'compliant', 'non-compliant', or empty for all
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const offset = parseInt(searchParams.get('offset') || '0');

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const collection = db.collection('symbol_prices');

    // Build search filter
    const filter: any = {};
    const andConditions: any[] = [];

    // Text search across symbol, name, and sectorName
    if (query) {
      andConditions.push({
        $or: [
          { symbol: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } },
          { sectorName: { $regex: query, $options: 'i' } },
        ],
      });
    }

    // Index filter - check if listedIn contains the index
    if (index) {
      filter.listedIn = { $regex: index, $options: 'i' };
    }

    // Sector filter - exact match on sectorName
    if (sector) {
      filter.sectorName = sector;
    }

    // Shariah compliance filter
    if (shariah === 'compliant') {
      andConditions.push({
        $or: [
          { isNonCompliant: false },
          { isNonCompliant: { $exists: false } },
        ],
      });
    } else if (shariah === 'non-compliant') {
      filter.isNonCompliant = true;
    }

    // Combine all $and conditions if any exist
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // Only include symbols with metadata (exclude bonds/bills without proper data)
    filter.isDebt = { $ne: true };
    filter.name = { $exists: true, $ne: '' };

    // Execute query with pagination
    const [companies, total] = await Promise.all([
      collection
        .find(filter)
        .project({
          symbol: 1,
          name: 1,
          sectorName: 1,
          currentPrice: 1,
          priceChange: 1,
          priceChangePercent: 1,
          listedIn: 1,
          isNonCompliant: 1,
          marketCapString: 1,
        })
        .sort({ symbol: 1 }) // Sort alphabetically by symbol
        .skip(offset)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    return NextResponse.json({
      companies: companies.map((c) => ({
        symbol: c.symbol,
        name: c.name || '',
        sectorName: c.sectorName || 'Unknown',
        currentPrice: c.currentPrice || null,
        priceChange: c.priceChange || null,
        priceChangePercent: c.priceChangePercent || null,
        listedIn: c.listedIn || '',
        isNonCompliant: c.isNonCompliant || false,
        marketCapString: c.marketCapString || null,
      })),
      total,
      hasMore: offset + companies.length < total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
