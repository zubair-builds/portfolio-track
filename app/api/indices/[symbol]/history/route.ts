import { NextRequest, NextResponse } from 'next/server';
import { getIndexPriceHistory } from '../../../../../lib/indicesStore';

/**
 * GET /api/indices/{symbol}/history?from=...&to=...&limit=...
 * Returns time series price data for charts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol;
    const { searchParams } = new URL(request.url);
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Index symbol is required' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limitParam = searchParams.get('limit');

    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    const limit = limitParam ? parseInt(limitParam) : 1000;

    const history = await getIndexPriceHistory(symbol, from, to, limit);

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      count: history.length,
      history: history.map(h => ({
        price: h.price,
        change: h.change,
        changePercent: h.changePercent,
        volume: h.volume,
        trades: h.trades,
        value: h.value,
        high: h.high,
        low: h.low,
        timestamp: h.timestamp,
      })),
    });
  } catch (error) {
    console.error('Error fetching index history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch index history' },
      { status: 500 }
    );
  }
}

