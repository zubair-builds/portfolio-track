import { NextRequest, NextResponse } from 'next/server';
import { getClosingPrices, getKlineRange, getKlines } from '@/lib/klinesStore';

/**
 * GET /api/klines/[symbol]?timeframe=1d&range=1y
 * Query stored K-Line data with optional range filtering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    
    const timeframe = searchParams.get('timeframe') || '1d';
    const range = searchParams.get('range'); // '1m', '6m', '1y', '5y'
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }
    
    const upperSymbol = symbol.toUpperCase();
    
    // Calculate date range based on range parameter
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (range) {
      const now = new Date();
      endDate = now;
      
      switch (range) {
        case '1m':
          // ~22 trading days (1 month)
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '6m':
          // ~126 trading days (6 months)
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          // ~252 trading days (1 year)
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case '5y':
          // ~1260 trading days (5 years)
          startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid range. Use: 1m, 6m, 1y, or 5y' },
            { status: 400 }
          );
      }
    } else if (startParam || endParam) {
      // Custom date range
      if (startParam) {
        startDate = new Date(parseInt(startParam));
      }
      if (endParam) {
        endDate = new Date(parseInt(endParam));
      }
    }
    
    // Get the data range info
    const dataRange = await getKlineRange(upperSymbol, timeframe);
    
    if (dataRange.count === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        range: {
          oldest: null,
          newest: null,
        },
        message: 'No data available for this symbol. Fetch data first.',
      });
    }
    
    // Fetch closing prices for chart
    const priceData = await getClosingPrices(
      upperSymbol,
      timeframe,
      startDate,
      endDate
    );
    
    // Also get full K-Line data for stats calculations
    const fullData = await getKlines(
      upperSymbol,
      timeframe,
      startDate,
      endDate
    );
    
    // Calculate stats for the selected range
    const prices = priceData.map(d => d.price);
    const high = prices.length > 0 ? Math.max(...prices) : 0;
    const low = prices.length > 0 ? Math.min(...prices) : 0;
    const first = prices[0] || 0;
    const last = prices[prices.length - 1] || 0;
    const change = last - first;
    const changePercent = first !== 0 ? (change / first) * 100 : 0;
    
    const avgVolume = fullData.length > 0
      ? fullData.reduce((sum, k) => sum + k.volume, 0) / fullData.length
      : 0;
    
    return NextResponse.json({
      success: true,
      data: priceData,
      count: priceData.length,
      range: {
        oldest: dataRange.oldest,
        newest: dataRange.newest,
        availableCount: dataRange.count,
      },
      stats: {
        high,
        low,
        first,
        last,
        change,
        changePercent,
        avgVolume,
      },
    });
  } catch (error) {
    console.error('Error querying K-Lines:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to query K-Lines',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

