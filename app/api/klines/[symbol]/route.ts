import { NextRequest, NextResponse } from 'next/server';
import { getKlineRange, getKlines } from '@/lib/klinesStore';

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
    let useDefaultLimit = false;
    
    if (range) {
      const now = new Date();
      endDate = now;
      
      switch (range) {
        case '1m':
          // ~22 trading days (1 month) - 30 calendar days
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '6m':
          // ~126 trading days (6 months) - 180 calendar days
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          // ~252 trading days (1 year) - 365 calendar days
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case '5y':
          // ~1260 trading days (5 years) - 5 * 365 calendar days
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
        const startTimestamp = parseInt(startParam);
        if (isNaN(startTimestamp)) {
          return NextResponse.json(
            { error: 'Invalid start timestamp' },
            { status: 400 }
          );
        }
        startDate = new Date(startTimestamp);
      }
      if (endParam) {
        const endTimestamp = parseInt(endParam);
        if (isNaN(endTimestamp)) {
          return NextResponse.json(
            { error: 'Invalid end timestamp' },
            { status: 400 }
          );
        }
        endDate = new Date(endTimestamp);
      }
    } else {
      // No date range specified - use default limit to prevent fetching all data
      // Default to last 3 months (90 days) with a limit
      const now = new Date();
      endDate = now;
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      useDefaultLimit = true;
    }
    
    // Ensure endDate is not in the future and startDate is before endDate
    const now = new Date();
    if (!endDate || endDate > now) {
      endDate = now;
    }
    if (startDate && startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
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
    
    // Determine appropriate limit based on timeframe and date range
    // For high-frequency timeframes, apply reasonable limits
    let queryLimit: number | undefined;
    if (useDefaultLimit) {
      // Calculate approximate number of records for the range
      const daysDiff = startDate && endDate 
        ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 90;
      
      // Estimate max records based on timeframe
      const recordsPerDay = timeframe === '1m' ? 390 : // ~390 1-min intervals in trading day
                           timeframe === '5m' ? 78 :
                           timeframe === '15m' ? 26 :
                           timeframe === '1h' ? 8 :
                           timeframe === '4h' ? 2 :
                           1; // 1d
      
      const estimatedRecords = daysDiff * recordsPerDay;
      // Cap at 10,000 records for safety
      queryLimit = Math.min(estimatedRecords, 10000);
    }
    
    // Get full K-Line data (OHLCV) for technical indicators
    const fullData = await getKlines(
      upperSymbol,
      timeframe,
      startDate,
      endDate,
      queryLimit
    );
    
    // Transform to include both simplified (for backward compatibility) and full OHLC data
    const priceData = fullData.map((kline) => ({
      date: kline.timestamp.toISOString(),
      price: kline.close,
      volume: kline.volume,
    }));
    
    // Full OHLC data for technical indicators
    const ohlcData = fullData.map((kline) => ({
      date: kline.timestamp.toISOString(),
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
    }));
    
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
      ohlc: ohlcData, // Full OHLC data for technical indicators
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
              },
      { status: 500 }
    );
  }
}

