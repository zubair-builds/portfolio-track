import type { Collection, Db } from 'mongodb';
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
  await collection.createIndex(
    { symbol: 1, timeframe: 1, timestamp: 1 },
    { unique: true }
  );
  
  // Create index on timestamp for sorting
  await collection.createIndex({ timestamp: -1 });
  
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
  } catch (error: any) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      console.log('Some K-Lines already exist, skipping duplicates');
      return error.result?.nUpserted || 0;
    }
    throw error;
  }
}

/**
 * Get K-Lines for a symbol with optional date filtering
 */
export async function getKlines(
  symbol: string,
  timeframe: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number
): Promise<KlineDocument[]> {
  const collection = await getKlinesCollection();
  
  const query: any = {
    symbol: symbol.toUpperCase(),
    timeframe,
  };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  let cursor = collection
    .find(query)
    .sort({ timestamp: 1 }); // Ascending for chart display
  
  if (limit) {
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
  endDate?: Date
): Promise<Array<{ date: string; price: number; volume?: number }>> {
  const klines = await getKlines(symbol, timeframe, startDate, endDate);
  
  return klines.map((kline) => ({
    date: kline.timestamp.toISOString(),
    price: kline.close,
    volume: kline.volume,
  }));
}

