import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { sortIndicesByPriority } from '@/lib/constants';

/**
 * API endpoint to get available filter options for companies
 * GET /api/companies/filters
 * Returns distinct sectors and indices
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const collection = db.collection('symbol_prices');

    // Get distinct sectors
    const sectors = await collection.distinct('sectorName', {
      isDebt: { $ne: true },
      name: { $exists: true, $ne: '' },
      sectorName: { $exists: true, $ne: '' },
    });

    // Get all documents with listedIn field to extract indices
    const docsWithIndices = await collection
      .find({
        listedIn: { $exists: true, $ne: '' },
        isDebt: { $ne: true },
        name: { $exists: true, $ne: '' },
      })
      .project({ listedIn: 1 })
      .toArray();

    // Extract and deduplicate indices
    const indexSet = new Set<string>();
    docsWithIndices.forEach((doc) => {
      if (doc.listedIn) {
        const indices = doc.listedIn.split(',').map((idx: string) => idx.trim()).filter(Boolean);
        indices.forEach((idx: string) => indexSet.add(idx));
      }
    });

    // Sort indices using centralized utility
    const indices = sortIndicesByPriority(Array.from(indexSet));

    // Sort sectors alphabetically, filter out empty/null values
    const sortedSectors = sectors
      .filter((s) => s && typeof s === 'string' && s.trim())
      .sort((a: string, b: string) => a.localeCompare(b));

    return NextResponse.json({
      sectors: sortedSectors,
      indices: indices,
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}

