import { NextRequest, NextResponse } from 'next/server';
import { getDividends, getUpcomingDividends, DividendFilter, Dividend } from '../../../lib/dividendModel';
import { getUserFromRequest } from '../../../lib/jwt';

/**
 * GET /api/dividends
 * List dividends with optional filtering
 * 
 * Query params:
 * - status: upcoming | eligible | closed | all (default: all)
 * - days: Number of days ahead for upcoming (default: 30)
 * - symbols: Comma-separated list of symbols to filter (optional)
 * - type: Cash | Bonus | Right Shares (optional)
 * - limit: Number of records to return (default: 100)
 * 
 * Example: /api/dividends?status=upcoming&days=60&symbols=HUBC,PSO
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'all';
    const daysParam = searchParams.get('days');
    const symbolsParam = searchParams.get('symbols');
    const typeParam = searchParams.get('type');
    const limitParam = searchParams.get('limit');

    const days = daysParam ? parseInt(daysParam, 10) : 30;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { success: false, error: 'Days must be between 1 and 365' },
        { status: 400 }
      );
    }

    let symbols: string[] | undefined;
    if (symbolsParam) {
      symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
    }

    let dividends;

    if (statusParam === 'upcoming') {
      dividends = await getUpcomingDividends(days, symbols);
    } else {
      // Build filter object
      const filter: DividendFilter = {};

      if (symbols && symbols.length > 0) {
        filter.symbol = symbols;
      }

      if (typeParam) {
        filter.dividendType = typeParam as Dividend['dividendType'];
      }

      if (statusParam !== 'all') {
        const statusMap: Record<string, string> = {
          eligible: 'Eligible',
          closed: 'Closed'
        };
        filter.eligibilityStatus = statusMap[statusParam] || statusParam;
      }

      filter.limit = limit;
      filter.uploadedBy = user.email;
      console.log(`[Dividends API] Fetching dividends with filter:`, JSON.stringify(filter));
      const result = await getDividends(filter);
      dividends = result.dividends;
      console.log(`[Dividends API] Found ${dividends.length} records`);
    }

    return NextResponse.json({
      success: true,
      count: dividends.length,
      data: dividends,
    });
  } catch (error) {
    console.error('Error in GET /api/dividends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dividends' },
      { status: 500 }
    );
  }
}

