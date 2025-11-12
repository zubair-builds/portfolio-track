import { NextRequest, NextResponse } from 'next/server';
import { getAllIndices, getIndicesByFrequency, saveIndexPrice, type IndexPriceData } from '../../../../lib/indicesStore';

const PSX_API_BASE = 'https://psxterminal.com/api';

interface IndexApiResponse {
  success: boolean;
  data: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    trades: number;
    value: number;
    high: number;
    low: number;
    timestamp: number;
    st?: string; // Market state: PRE, OPN, SUS, CLS
  };
}

async function fetchIndexPrice(symbol: string): Promise<IndexApiResponse | null> {
  try {
    const response = await fetch(`${PSX_API_BASE}/ticks/IDX/${symbol.toUpperCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://psxterminal.com/',
      },
      next: { revalidate: 0 }, // Don't cache
    });

    if (!response.ok) {
      return null;
    }

    const data: IndexApiResponse = await response.json();
    
    if (!data.success || !data.data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const frequencyParam = searchParams.get('frequency');
    const allParam = searchParams.get('all');

    let indicesToUpdate;

    if (allParam === 'true') {
      // Update all indices
      indicesToUpdate = await getAllIndices();
    } else if (frequencyParam) {
      // Update by frequency (e.g., 'realtime')
      indicesToUpdate = await getIndicesByFrequency(frequencyParam as any);
    } else if (symbolsParam) {
      // Update specific symbols
      const symbols = symbolsParam.split(',').map(s => s.trim());
      const allIndices = await getAllIndices();
      indicesToUpdate = allIndices.filter(idx => 
        symbols.includes(idx.symbol.toUpperCase())
      );
    } else {
      // Default: update realtime indices
      indicesToUpdate = await getIndicesByFrequency('realtime');
    }

    if (indicesToUpdate.length === 0) {
      return NextResponse.json(
        { error: 'No indices found to update' },
        { status: 404 }
      );
    }

    const results: Record<string, any> = {};
    let successCount = 0;
    let failedCount = 0;

    // Fetch prices with small delay between requests
    for (let i = 0; i < indicesToUpdate.length; i++) {
      const index = indicesToUpdate[i];
      
      const apiData = await fetchIndexPrice(index.symbol);

      if (apiData && apiData.data) {
        try {
          const priceData: IndexPriceData = {
            indexSymbol: index.symbol,
            price: apiData.data.price,
            change: apiData.data.change,
            changePercent: apiData.data.changePercent,
            volume: apiData.data.volume,
            trades: apiData.data.trades,
            value: apiData.data.value,
            high: apiData.data.high,
            low: apiData.data.low,
            timestamp: new Date(
              apiData.data.timestamp > 1_000_000_000_000
                ? apiData.data.timestamp
                : apiData.data.timestamp * 1000
            ),
            marketState: apiData.data.st,
          };

          await saveIndexPrice(priceData);
          
          results[index.symbol] = {
            success: true,
            price: apiData.data.price,
            change: apiData.data.change,
            changePercent: apiData.data.changePercent,
            timestamp: priceData.timestamp,
          };
          
          successCount++;
        } catch (error) {
          results[index.symbol] = {
            success: false,
            error: 'Failed to save price data',
          };
          failedCount++;
        }
      } else {
        results[index.symbol] = {
          success: false,
          error: 'No data from API',
        };
        failedCount++;
      }

      // Small delay between requests to avoid rate limiting
      if (i < indicesToUpdate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      updated: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error('Error refreshing index prices:', error);
    return NextResponse.json(
      { error: 'Failed to refresh index prices' },
      { status: 500 }
    );
  }
}

