import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingDividends } from '../../../lib/dividendsStore';

/**
 * GET /api/dividends
 * List upcoming dividends (ex-dates in the future)
 * 
 * Query params:
 * - days: Number of days ahead to look (default: 30)
 * - symbols: Comma-separated list of symbols to filter (optional)
 * 
 * Example: /api/dividends?days=60&symbols=HUBC,PSO
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const symbolsParam = searchParams.get('symbols');

    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days must be between 1 and 365' },
        { status: 400 }
      );
    }

    let symbols: string[] | undefined;
    if (symbolsParam) {
      symbols = symbolsParam.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    const upcoming = await getUpcomingDividends(days, symbols);

    return NextResponse.json({
      success: true,
      count: upcoming.length,
      daysAhead: days,
      dividends: upcoming,
    });
  } catch (error) {
    console.error('Error in GET /api/dividends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming dividends' },
      { status: 500 }
    );
  }
}

