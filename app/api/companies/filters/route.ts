import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

/**
 * API endpoint to get available filter options for companies
 * GET /api/companies/filters
 * Returns distinct sectors and indices
 */
export async function GET(request: NextRequest) {
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
    docsWithIndices.forEach((doc: any) => {
      if (doc.listedIn) {
        const indices = doc.listedIn.split(',').map((idx: string) => idx.trim()).filter(Boolean);
        indices.forEach((idx: string) => indexSet.add(idx));
      }
    });

    // Priority order for indices
    const priorityOrder = [
      'mznpi', 'kmi30', 'mii30', 'kmiallshr', 'kse30', 'psxdiv20',
      'kse100', 'kse100pr', 'bkti30', 'jsmfi', 'ogti', 'upp9',
      'nitpgi', 'hbltti', 'jsgbkti', 'aci'
    ];

    // Sort indices: priority indices first (in order), then rest alphabetically
    const indices = Array.from(indexSet).sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aIndex = priorityOrder.findIndex(p => p.toLowerCase() === aLower);
      const bIndex = priorityOrder.findIndex(p => p.toLowerCase() === bLower);

      // Both are priority indices - sort by priority order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // Only a is priority - a comes first
      if (aIndex !== -1) {
        return -1;
      }
      // Only b is priority - b comes first
      if (bIndex !== -1) {
        return 1;
      }
      // Neither is priority - sort alphabetically
      return aLower.localeCompare(bLower);
    });

    // Sort sectors alphabetically, filter out empty/null values
    const sortedSectors = sectors
      .filter((s: any) => s && s.trim())
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

