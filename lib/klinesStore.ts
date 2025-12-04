import type { Collection, Db, Filter } from 'mongodb';
import clientPromise from './mongodb';

export interface KlineData {
  symbol: string;
  timeframe: string; // '1m', '5m', '15m', '1h', '4h', '1d'
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface KlineDocument extends KlineData {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;
}

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
}

const KLINES_COLLECTION = 'klines';

async function getKlinesCollection(): Promise<Collection<KlineDocument>> {
  const db = await getDb();
  const collection = db.collection<KlineDocument>(KLINES_COLLECTION);

  // Create compound unique index on symbol + timeframe + timestamp
  // This index is optimized for queries filtering by symbol, timeframe, and timestamp range
  // The order: symbol (exact match) -> timeframe (exact match) -> timestamp (range/sort)
  // This allows MongoDB to efficiently use the index for both filtering and sorting
  try {
    await collection.createIndex(
      { symbol: 1, timeframe: 1, timestamp: 1 },
      { unique: true, name: 'symbol_timeframe_timestamp_unique' }
    );
  } catch (error) {
    // Index may already exist, ignore
    const err = error as { code?: number; codeName?: string };
    if (err.code !== 85 && err.codeName !== 'IndexOptionsConflict') {
      console.error('Error creating compound index:', err);
    }
  }

  // Additional index on timestamp for queries that only filter by timestamp
  // (though the compound index above is more commonly used)
  try {
    await collection.createIndex({ timestamp: -1 }, { name: 'timestamp_desc' });
  } catch (error) {
    // Index may already exist, ignore
    const err = error as { code?: number; codeName?: string };
    if (err.code !== 85 && err.codeName !== 'IndexOptionsConflict') {
      console.error('Error creating timestamp index:', err);
    }
  }

  return collection;
}

/**
 * Save multiple K-Line records in batch with upsert
 */
export async function saveKlinesBatch(data: KlineData[]): Promise<number> {
  if (data.length === 0) return 0;

  const collection = await getKlinesCollection();
  const now = new Date();

  const operations = data.map((kline) => ({
    updateOne: {
      filter: {
        symbol: kline.symbol.toUpperCase(),
        timeframe: kline.timeframe,
        timestamp: kline.timestamp,
      },
      update: {
        $set: {
          symbol: kline.symbol.toUpperCase(),
          timeframe: kline.timeframe,
          timestamp: kline.timestamp,
          open: kline.open,
          high: kline.high,
          low: kline.low,
          close: kline.close,
          volume: kline.volume,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      upsert: true,
    },
  }));

  try {
    const result = await collection.bulkWrite(operations, { ordered: false });
    return result.upsertedCount + result.modifiedCount;
  } catch (error) {
    // Handle duplicate key errors gracefully
    const err = error as { code?: number; result?: { nUpserted?: number } };
    if (err.code === 11000) {
      console.log('Some K-Lines already exist, skipping duplicates');
      return err.result?.nUpserted || 0;
    }
    throw error;
  }
}

/**
 * Get K-Lines for a symbol with optional date filtering
 * Optimized to use compound index efficiently: { symbol: 1, timeframe: 1, timestamp: 1 }
 */
export async function getKlines(
  symbol: string,
  timeframe: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number
): Promise<KlineDocument[]> {
  const collection = await getKlinesCollection();

  // Build query that efficiently uses the compound index
  // Index: { symbol: 1, timeframe: 1, timestamp: 1 }
  const query: Filter<KlineDocument> = {
    symbol: symbol.toUpperCase(),
    timeframe,
  };

  // Add date filtering to use the timestamp part of the compound index
  // MongoDB can efficiently use the compound index when filtering by prefix fields + range on last field
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) {
      // Ensure date is properly normalized (remove milliseconds for consistency)
      const normalizedStart = new Date(startDate);
      normalizedStart.setMilliseconds(0);
      query.timestamp.$gte = normalizedStart;
    }
    if (endDate) {
      // Ensure date is properly normalized and includes the full end date
      const normalizedEnd = new Date(endDate);
      normalizedEnd.setMilliseconds(999);
      query.timestamp.$lte = normalizedEnd;
    }
  }

  // Use compound index efficiently: symbol + timeframe are exact matches, timestamp is range
  // Sort order matches the compound index structure for optimal performance
  let cursor = collection
    .find(query)
    .sort({ timestamp: 1 }); // Ascending for chart display - uses index efficiently

  // Apply limit to prevent fetching too much data
  if (limit && limit > 0) {
    cursor = cursor.limit(limit);
  }

  return cursor.toArray();
}

/**
 * Get the most recent K-Line for a symbol
 */
export async function getLatestKline(
  symbol: string,
  timeframe: string
): Promise<KlineDocument | null> {
  const collection = await getKlinesCollection();

  return collection.findOne(
    {
      symbol: symbol.toUpperCase(),
      timeframe,
    },
    {
      sort: { timestamp: -1 },
    }
  );
}

/**
 * Check if K-Line data exists for a symbol
 */
export async function hasKlineData(
  symbol: string,
  timeframe: string
): Promise<boolean> {
  const collection = await getKlinesCollection();

  const count = await collection.countDocuments({
    symbol: symbol.toUpperCase(),
    timeframe,
  });

  return count > 0;
}

/**
 * Get the date range of available K-Line data
 */
export async function getKlineRange(
  symbol: string,
  timeframe: string
): Promise<{
  oldest: Date | null;
  newest: Date | null;
  count: number;
}> {
  const collection = await getKlinesCollection();

  const query = {
    symbol: symbol.toUpperCase(),
    timeframe,
  };

  const count = await collection.countDocuments(query);

  if (count === 0) {
    return { oldest: null, newest: null, count: 0 };
  }

  const [oldestDoc, newestDoc] = await Promise.all([
    collection.findOne(query, { sort: { timestamp: 1 } }),
    collection.findOne(query, { sort: { timestamp: -1 } }),
  ]);

  return {
    oldest: oldestDoc?.timestamp || null,
    newest: newestDoc?.timestamp || null,
    count,
  };
}

/**
 * Get closing prices for chart display (simplified data)
 */
export async function getClosingPrices(
  symbol: string,
  timeframe: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number
): Promise<Array<{ date: string; price: number; volume?: number }>> {
  const klines = await getKlines(symbol, timeframe, startDate, endDate, limit);

  return klines.map((kline) => ({
    date: kline.timestamp.toISOString(),
    price: kline.close,
    volume: kline.volume,
  }));
}



/**
 * Get K-Line for a specific date (1d timeframe)
 * Used for looking up historical prices
 */
export async function getKlineForDate(
  symbol: string,
  date: Date
): Promise<KlineDocument | null> {
  const collection = await getKlinesCollection();

  // Normalize date to start of day (UTC) to match how klines are stored
  // Assuming klines are stored with 00:00:00 timestamp for daily candles
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  return collection.findOne({
    symbol: symbol.toUpperCase(),
    timeframe: '1d',
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
}
