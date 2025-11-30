import { NextRequest, NextResponse } from 'next/server';
import { getSymbolPriceData, saveSymbolPriceData, batchGetSymbolMetadata } from '../../../../lib/symbolsStore';

/**
 * Transform PSX API data to StockApiResponse format
 */
import { SymbolPriceDocument } from '../../../../lib/symbolsStore';

/**
 * Transform PSX API data to StockApiResponse format
 */
function transformToStockApiFormat(dbData: SymbolPriceDocument) {
  return {
    market: 'REG',
    st: 'OPEN',
    symbol: dbData.symbol,
    price: dbData.currentPrice || 0,
    change: dbData.priceChange || 0,
    changePercent: dbData.priceChangePercent || 0,
    volume: dbData.volume || 0,
    trades: dbData.trades || 0,
    value: dbData.value || 0,
    high: dbData.priceHigh || dbData.currentPrice || 0,
    low: dbData.priceLow || dbData.currentPrice || 0,
    bid: dbData.bidPrice || 0,
    ask: dbData.askPrice || 0,
    bidVol: dbData.bidVolume || 0,
    askVol: dbData.askVolume || 0,
    timestamp: dbData.lastFetchedAt ? new Date(dbData.lastFetchedAt).getTime() : Date.now(),
  };
}

/**
 * Fetch single symbol price from PSX and save to DB
 */
async function fetchAndSaveSymbol(symbol: string) {
  const upperSymbol = symbol.toUpperCase();

  // Check current state in database
  const existingData = await getSymbolPriceData(upperSymbol);

  // If price exists in database, return it
  if (existingData?.currentPrice) {
    return transformToStockApiFormat(existingData);
  }

  // const response = null
  // Fetch from PSX Terminal API
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE || 'https://psxterminal.com/api'}/ticks/REG/${upperSymbol}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://psxterminal.com/',
      },
    }
  );

  if (!response.ok) {
    // If API fails, return existing data if available
    if (existingData?.currentPrice) {
      return transformToStockApiFormat(existingData);
    }
    throw new Error(`PSX API returned ${response.status}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    // If API fails, return existing data if available
    if (existingData?.currentPrice) {
      return transformToStockApiFormat(existingData);
    }
    throw new Error('No price data available from PSX');
  }

  const apiData = result.data;

  // Transform and save to MongoDB
  const symbolPriceData = {
    symbol: upperSymbol,
    currentPrice: apiData.price || null,
    priceChange: apiData.change || null,
    priceChangePercent: apiData.changePercent || null,
    priceHigh: apiData.high || null,
    priceLow: apiData.low || null,
    volume: apiData.volume || null,
    trades: apiData.trades || null,
    value: apiData.value || null,
    bidPrice: apiData.bid || null,
    askPrice: apiData.ask || null,
    bidVolume: apiData.bidVol || null,
    askVolume: apiData.askVol || null,
    lastFetchedAt: new Date(
      apiData.timestamp > 1_000_000_000_000
        ? apiData.timestamp
        : apiData.timestamp * 1000
    ),
  };

  await saveSymbolPriceData(symbolPriceData);

  return transformToStockApiFormat(symbolPriceData as unknown as SymbolPriceDocument);
}

/**
 * GET /api/symbols/fetch-price?symbol=SYMBOL
 * Fetch price for a single symbol
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }
    const data = await fetchAndSaveSymbol(symbol);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching symbol price:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch price data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/symbols/fetch-price
 * Body: { symbols: string[] }
 * Fetch prices for multiple symbols in batch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    // First, get all symbols from database

    const dbDataMap = await batchGetSymbolMetadata(symbols);

    const results: Record<string, unknown> = {};
    const symbolsNeedingFetch: string[] = [];

    // Check which symbols need fetching
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      const dbData = dbDataMap.get(upperSymbol);

      // If we have current price in database, use it
      if (dbData?.currentPrice !== null && dbData?.currentPrice !== undefined) {
        results[upperSymbol] = transformToStockApiFormat(dbData);
        continue;
      }

      symbolsNeedingFetch.push(upperSymbol);
    }

    // Fetch missing symbols from API
    if (symbolsNeedingFetch.length > 0) {

      // Fetch with delays to avoid rate limiting

      for (let i = 0; i < symbolsNeedingFetch.length; i++) {
        const symbol = symbolsNeedingFetch[i];

        try {
          const data = await fetchAndSaveSymbol(symbol);
          results[symbol] = data;
        } catch (error) {
          console.error(`Failed to fetch ${symbol}:`, error);
          // If we have any data in DB, use it
          const dbData = dbDataMap.get(symbol);
          if (dbData?.currentPrice) {
            results[symbol] = transformToStockApiFormat(dbData);
          }
        }

        // Add delay between requests to avoid rate limiting (except for last one)
        if (i < symbolsNeedingFetch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      fromCache: symbols.length - symbolsNeedingFetch.length,
      fromAPI: symbolsNeedingFetch.length,
    });
  } catch (error) {
    console.error('Error fetching batch symbol prices:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch price data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

