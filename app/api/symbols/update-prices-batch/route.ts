import { NextRequest, NextResponse } from 'next/server';
import { batchSaveSymbolPriceData, SymbolPriceData } from '../../../../lib/symbolsStore';

/**
 * POST /api/symbols/update-prices-batch
 * Batch update symbol prices from WebSocket stream
 * 
 * Body:
 * - updates: Array<{
 *     symbol: string;
 *     currentPrice?: number;
 *     priceChange?: number;
 *     priceChangePercent?: number;
 *     volume?: number;
 *     trades?: number;
 *     value?: number;
 *     priceHigh?: number;
 *     priceLow?: number;
 *     bidPrice?: number;
 *     askPrice?: number;
 *     bidVolume?: number;
 *     askVolume?: number;
 *     lastFetchedAt?: number; // timestamp
 *   }>
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.updates || !Array.isArray(body.updates)) {
      return NextResponse.json(
        { error: 'Invalid request: updates array is required' },
        { status: 400 }
      );
    }

    if (body.updates.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        total: 0,
      });
    }

    // Convert updates to SymbolPriceData format
    const priceDataUpdates: SymbolPriceData[] = body.updates.map((update: Record<string, unknown>) => ({
      symbol: update.symbol as string,
      // Map WebSocket tickUpdate fields to database schema
      currentPrice: update.currentPrice as number | undefined,
      priceChange: update.priceChange as number | undefined,
      priceChangePercent: update.priceChangePercent as number | undefined,
      volume: update.volume as number | undefined,
      trades: update.trades as number | undefined,
      value: update.value as number | undefined,
      priceHigh: update.priceHigh as number | undefined,
      priceLow: update.priceLow as number | undefined,
      bidPrice: update.bidPrice as number | undefined,
      askPrice: update.askPrice as number | undefined,
      bidVolume: update.bidVolume as number | undefined,
      askVolume: update.askVolume as number | undefined,
      // Convert timestamp to Date if provided
      lastFetchedAt: update.lastFetchedAt
        ? new Date(update.lastFetchedAt as string | number)
        : new Date(),
    }));

    // Use batch update for better performance - single database call instead of many
    const startTime = Date.now();
    const result = await batchSaveSymbolPriceData(priceDataUpdates);
    const duration = Date.now() - startTime;

    console.log(`[BatchUpdate] Processed ${result.total} updates: ${result.updated} updated, ${result.errors.length} errors in ${duration}ms`);

    return NextResponse.json({
      success: true,
      updated: result.updated,
      total: result.total,
      errors: result.errors.length > 0 ? result.errors : undefined,
      duration: duration,
    });
  } catch (error) {
    console.error('Error in batch update endpoint:', error);

    return NextResponse.json(
      {
        error: 'Failed to process batch update',
              },
      { status: 500 }
    );
  }
}

