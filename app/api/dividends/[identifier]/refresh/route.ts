import { NextResponse } from 'next/server';
import { saveDividendBatch, type DividendRecord } from '../../../../../lib/dividendsStore';

const PSX_API_BASE = 'https://psxterminal.com/api';

interface PSXDividendResponse {
  success: boolean;
  data: Array<{
    symbol: string;
    ex_date: string;         // YYYY-MM-DD
    payment_date: string;    // YYYY-MM-DD
    record_date: string;     // YYYY-MM-DD
    amount: number;
    year: number;
  }>;
  count: number;
  symbol: string;
  timestamp: number;
  cacheUpdated: string;
}

async function fetchDividendsFromPSX(symbol: string): Promise<PSXDividendResponse | null> {
  try {
    // PSX API uses lowercase symbols for dividends endpoint
    const response = await fetch(`${PSX_API_BASE}/dividends/${symbol.toLowerCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://psxterminal.com/',
      },
      next: { revalidate: 0 }, // Don't cache
    });

    if (!response.ok) {
      console.error(`PSX API returned ${response.status} for ${symbol}`);
      return null;
    }

    const data: PSXDividendResponse = await response.json();

    if (!data.success || !data.data || data.data.length === 0) {
      console.log(`No dividend data available for ${symbol}`);
      return data; // Return empty data, not null
    }

    return data;
  } catch (error) {
    console.error(`Failed to fetch dividend data for ${symbol}:`, error);
    return null;
  }
}

/**
 * GET /api/dividends/[symbol]/refresh
 * Fetch fresh dividend history from PSX Terminal API and update MongoDB
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;
    const symbol = identifier;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Fetch from PSX Terminal API
    const psxData = await fetchDividendsFromPSX(symbol);

    if (!psxData) {
      return NextResponse.json(
        { error: `Failed to fetch dividend data for ${symbol} from PSX Terminal` },
        { status: 500 }
      );
    }

    if (!psxData.data || psxData.data.length === 0) {
      return NextResponse.json({
        success: true,
        symbol: symbol.toUpperCase(),
        count: 0,
        dividends: [],
        message: `No dividend history found for ${symbol}`,
      });
    }

    // Transform PSX data to our schema
    const dividendRecords: DividendRecord[] = psxData.data.map(d => ({
      symbol: symbol.toUpperCase(),
      exDate: new Date(d.ex_date),
      paymentDate: new Date(d.payment_date),
      recordDate: new Date(d.record_date),
      amount: d.amount,
      year: d.year,
      createdAt: new Date(),
    }));

    // Save to MongoDB (upsert to avoid duplicates)
    const savedCount = await saveDividendBatch(dividendRecords);

    return NextResponse.json({
      success: true,
      symbol: symbol.toUpperCase(),
      count: dividendRecords.length,
      saved: savedCount,
      dividends: dividendRecords,
      message: `Dividend history refreshed for ${symbol}`,
    });
  } catch (error) {
    console.error(`Error in GET /api/dividends/${(await params).identifier}/refresh:`, error);
    return NextResponse.json(
      { error: 'Failed to refresh dividend history' },
      { status: 500 }
    );
  }
}

