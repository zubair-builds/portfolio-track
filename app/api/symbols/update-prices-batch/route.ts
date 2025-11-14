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
    const priceDataUpdates: SymbolPriceData[] = body.updates.map((update: any) => ({
      symbol: update.symbol,
      // Map WebSocket tickUpdate fields to database schema
      currentPrice: update.currentPrice,
      priceChange: update.priceChange,
      priceChangePercent: update.priceChangePercent,
      volume: update.volume,
      trades: update.trades,
      value: update.value,
      priceHigh: update.priceHigh,
      priceLow: update.priceLow,
      bidPrice: update.bidPrice,
      askPrice: update.askPrice,
      bidVolume: update.bidVolume,
      askVolume: update.askVolume,
      // Convert timestamp to Date if provided
      lastFetchedAt: update.lastFetchedAt 
        ? new Date(update.lastFetchedAt) 
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
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

