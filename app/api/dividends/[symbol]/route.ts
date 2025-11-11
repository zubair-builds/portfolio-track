import { NextRequest, NextResponse } from 'next/server';
import { getDividendHistory, getDividendsByYear, getDividendSummary } from '../../../../lib/dividendsStore';

/**
 * GET /api/dividends/[symbol]
 * Get dividend history for a specific symbol from MongoDB cache
 * 
 * Query params:
 * - year: Filter by specific year (optional)
 * - limit: Number of records to return (default: all)
 * - summary: Return summary instead of full history (true/false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const limitParam = searchParams.get('limit');
    const summaryParam = searchParams.get('summary');

    // Return summary if requested
    if (summaryParam === 'true') {
      const summary = await getDividendSummary(symbol);
      return NextResponse.json({
        success: true,
        symbol: symbol.toUpperCase(),
        summary,
      });
    }

    let dividends;

    if (yearParam) {
      // Filter by year
      const year = parseInt(yearParam, 10);
      if (isNaN(year) || year < 2000 || year > 2100) {
        return NextResponse.json(
          { error: 'Invalid year parameter' },
          { status: 400 }
        );
      }
      dividends = await getDividendsByYear(symbol, year);
    } else {
      // Get all or limited history
      const limit = limitParam ? parseInt(limitParam, 10) : undefined;
      if (limit !== undefined && (isNaN(limit) || limit < 1)) {
        return NextResponse.json(
          { error: 'Invalid limit parameter' },
          { status: 400 }
        );
      }
      dividends = await getDividendHistory(symbol, limit);
    }

    return NextResponse.json({
      success: true,
      symbol: symbol.toUpperCase(),
      count: dividends.length,
      dividends,
    });
  } catch (error) {
    console.error(`Error in GET /api/dividends/${(await params).symbol}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch dividend history' },
      { status: 500 }
    );
  }
}

