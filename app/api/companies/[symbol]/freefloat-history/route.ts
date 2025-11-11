import { NextRequest, NextResponse } from 'next/server';
import { getFreeFloatHistory } from '../../../../../lib/companiesStore';

/**
 * GET /api/companies/[symbol]/freefloat-history
 * Get free float change history for a symbol
 * 
 * Query params:
 * - limit: Number of records to return (default: 10)
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
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    const history = await getFreeFloatHistory(symbol, limit);

    return NextResponse.json({
      success: true,
      symbol: symbol.toUpperCase(),
      count: history.length,
      history,
    });
  } catch (error) {
    console.error(`Error in GET /api/companies/${(await params).symbol}/freefloat-history:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch free float history' },
      { status: 500 }
    );
  }
}

