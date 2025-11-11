import { NextRequest, NextResponse } from 'next/server';
import { saveKlinesBatch, getKlineRange } from '@/lib/klinesStore';

const PSX_API_BASE = 'https://psxterminal.com/api';
const RATE_LIMIT_DELAY = 650; // 650ms between requests

interface PSXKlineResponse {
  success: boolean;
  data: Array<{
    symbol: string;
    timeframe: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  count: number;
}

/**
 * POST /api/klines/fetch
 * Fetch K-Line data from PSX Terminal API and store in MongoDB
 * 
 * Body: { symbol: string, timeframe?: string, years?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, timeframe = '1d', years = 5 } = body;
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }
    
    const upperSymbol = symbol.toUpperCase();
    
    // Check if data already exists
    const existingRange = await getKlineRange(upperSymbol, timeframe);
    
    if (existingRange.count > 0) {
      // Data exists, check if it's recent enough
      const daysSinceUpdate = existingRange.newest 
        ? (Date.now() - existingRange.newest.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      
      if (daysSinceUpdate < 1 && existingRange.count > 1000) {
        // Data is recent and sufficient, return existing range
        return NextResponse.json({
          success: true,
          message: 'Data already exists and is up to date',
          symbol: upperSymbol,
          timeframe,
          dateRange: {
            oldest: existingRange.oldest,
            newest: existingRange.newest,
          },
          count: existingRange.count,
          alreadyExists: true,
        });
      }
    }
    
    // Calculate how many records we need for the specified years
    // For daily: ~252 trading days per year
    const expectedRecords = timeframe === '1d' ? years * 252 : years * 252 * 6; // rough estimate
    const limit = 100; // PSX API max limit
    const totalBatches = Math.ceil(expectedRecords / limit);
    
    let allKlines: any[] = [];
    let oldestTimestamp: number | null = null;
    
    // Fetch data in batches
    for (let batch = 0; batch < totalBatches; batch++) {
      try {
        // Build URL with pagination
        let url = `${PSX_API_BASE}/klines/${upperSymbol}/${timeframe}?limit=${limit}`;
        
        // If we have data from previous batch, use the oldest timestamp as end date
        if (oldestTimestamp) {
          url += `&end=${oldestTimestamp}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://psxterminal.com/',
          },
        });
        
        if (!response.ok) {
          console.error(`PSX API returned ${response.status} for ${upperSymbol}`);
          break; // Stop fetching on error
        }
        
        const result: PSXKlineResponse = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          console.log(`No more data available for ${upperSymbol} at batch ${batch}`);
          break; // No more data available
        }
        
        allKlines = allKlines.concat(result.data);
        
        // Update oldest timestamp for next iteration
        const batchOldest = Math.min(...result.data.map(k => k.timestamp));
        oldestTimestamp = batchOldest;
        
        // If we got less than limit, we've reached the end
        if (result.data.length < limit) {
          break;
        }
        
        // Rate limiting delay
        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      } catch (error) {
        console.error(`Error fetching batch ${batch}:`, error);
        break; // Stop on error but save what we have
      }
    }
    
    if (allKlines.length === 0) {
      return NextResponse.json(
        { 
          error: 'No data available from PSX Terminal API',
          symbol: upperSymbol,
          timeframe,
        },
        { status: 404 }
      );
    }
    
    // Transform and save to MongoDB
    const klinesData = allKlines.map((kline) => ({
      symbol: upperSymbol,
      timeframe: kline.timeframe,
      timestamp: new Date(
        kline.timestamp > 1_000_000_000_000 
          ? kline.timestamp 
          : kline.timestamp * 1000
      ),
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
    }));
    
    const storedCount = await saveKlinesBatch(klinesData);
    
    // Get the final range
    const finalRange = await getKlineRange(upperSymbol, timeframe);
    
    return NextResponse.json({
      success: true,
      message: `Fetched and stored ${allKlines.length} K-Lines for ${upperSymbol}`,
      symbol: upperSymbol,
      timeframe,
      count: allKlines.length,
      storedCount,
      dateRange: {
        oldest: finalRange.oldest,
        newest: finalRange.newest,
      },
      totalRecords: finalRange.count,
    });
  } catch (error) {
    console.error('Error fetching K-Lines:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch K-Lines',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

