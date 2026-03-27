import { NextRequest, NextResponse } from 'next/server';
// getAllMutualFunds and getMutualFund imports removed
import type { Filter } from 'mongodb';
import type { MutualFundDocument } from '../../../../lib/mutualFundModel';
import clientPromise from '../../../../lib/mongodb';

/**
 * API endpoint to list mutual funds with filtering and search capabilities
 * GET /api/mutual-funds/list?q=searchTerm&category=Equity&limit=100&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const amc = searchParams.get('amc') || '';
    const shariah = searchParams.get('shariah') || ''; // 'compliant', 'non-compliant', or empty for all
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500); // Max 500
    const offset = parseInt(searchParams.get('offset') || '0');

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const collection = db.collection<MutualFundDocument>('mutual_funds');

    // Build search filter
    const filter: Filter<MutualFundDocument> = {};
    const andConditions: Filter<MutualFundDocument>[] = [];

    // Text search across fundName, amc, and category
    if (query) {
      andConditions.push({
        $or: [
          { fundName: { $regex: query, $options: 'i' } },
          { fundCode: { $regex: query, $options: 'i' } },
          { amc: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } },
        ],
      });
    }

    // Category filter
    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    // AMC filter
    if (amc) {
      filter.amc = { $regex: amc, $options: 'i' };
    }

    // Shariah compliance filter - check if category contains "Shariah" or "Shariah Compliant"
    if (shariah === 'compliant') {
      andConditions.push({
        category: { $regex: 'Shariah', $options: 'i' },
      });
    } else if (shariah === 'non-compliant') {
      andConditions.push({
        $and: [
          { category: { $exists: true } },
          { category: { $not: { $regex: 'Shariah', $options: 'i' } } },
        ],
      });
    }

    // Combine all $and conditions if any exist
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // Get total count
    const total = await collection.countDocuments(filter);

    // Fetch funds with pagination
    const funds = await collection
      .find(filter)
      .sort({ fundName: 1 }) // Sort by fund name alphabetically
      .skip(offset)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      funds: funds.map(fund => ({
        _id: fund._id?.toString(),
        fundCode: fund.fundCode,
        fundName: fund.fundName,
        amc: fund.amc,
        category: fund.category,
        sector: fund.sector,
        rating: fund.rating,
        benchmark: fund.benchmark,
        currentNAV: fund.currentNAV,
        lastNAVUpdate: fund.lastNAVUpdate,
        ytdReturn: fund.ytdReturn,
        mtdReturn: fund.mtdReturn,
        return1Day: fund.return1Day,
        return15Days: fund.return15Days,
        return30Days: fund.return30Days,
        return90Days: fund.return90Days,
        return180Days: fund.return180Days,
        return270Days: fund.return270Days,
        return365Days: fund.return365Days,
        return2Years: fund.return2Years,
        return3Years: fund.return3Years,
        createdAt: fund.createdAt,
        updatedAt: fund.updatedAt,
      })),
      total,
      count: funds.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Mutual Funds List API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch mutual funds',
              },
      { status: 500 }
    );
  }
}
