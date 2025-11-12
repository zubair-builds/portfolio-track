import type { Collection, Db } from 'mongodb';
import clientPromise from './mongodb';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type IndexUpdateFrequency = 'realtime' | 'hourly' | 'daily' | 'manual';

export interface IndexLatestPrice {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trades: number;
  value: number;
  high: number;
  low: number;
  timestamp: Date;
  marketState?: string; // Market state: PRE, OPN, SUS, CLS
}

export interface IndexMetadata {
  symbol: string;
  name: string;
  description?: string;
  symbolCount?: number;
  symbols?: string[];
  updateFrequency?: IndexUpdateFrequency;
  latestPrice?: IndexLatestPrice;
  lastUpdated?: Date;
  createdAt?: Date;
}

export interface IndexPriceData {
  indexSymbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trades: number;
  value: number;
  high: number;
  low: number;
  timestamp: Date;
  marketState?: string; // Market state: PRE, OPN, SUS, CLS
}

interface IndexMetadataDocument extends IndexMetadata {
  _id?: string;
  createdAt: Date;
  lastUpdated: Date;
}

interface IndexPriceDocument extends IndexPriceData {
  _id?: string;
}

// ============================================================================
// Database Access
// ============================================================================

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
}

const INDICES_COLLECTION = 'indices';
const INDEX_PRICES_COLLECTION = 'index_prices';

async function getIndicesCollection(): Promise<Collection<IndexMetadataDocument>> {
  const db = await getDb();
  const collection = db.collection<IndexMetadataDocument>(INDICES_COLLECTION);
  await collection.createIndex({ symbol: 1 }, { unique: true });
  await collection.createIndex({ updateFrequency: 1 });
  return collection;
}

async function getIndexPricesCollection(): Promise<Collection<IndexPriceDocument>> {
  const db = await getDb();
  const collection = db.collection<IndexPriceDocument>(INDEX_PRICES_COLLECTION);
  await collection.createIndex({ indexSymbol: 1 });
  await collection.createIndex({ timestamp: -1 });
  await collection.createIndex({ indexSymbol: 1, timestamp: -1 });
  
  // TTL index: auto-delete documents older than 30 days
  await collection.createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 }
  );
  
  return collection;
}

// ============================================================================
// Metadata Operations
// ============================================================================

/**
 * Save or update index metadata
 */
export async function saveIndexMetadata(metadata: IndexMetadata): Promise<void> {
  const collection = await getIndicesCollection();
  const now = new Date();

  const updateFields: any = {
    symbol: metadata.symbol.toUpperCase(),
    name: metadata.name,
    lastUpdated: now,
  };

  if (metadata.description !== undefined) updateFields.description = metadata.description;
  if (metadata.symbolCount !== undefined) updateFields.symbolCount = metadata.symbolCount;
  if (metadata.symbols !== undefined) updateFields.symbols = metadata.symbols;
  if (metadata.updateFrequency !== undefined) updateFields.updateFrequency = metadata.updateFrequency;
  if (metadata.latestPrice !== undefined) updateFields.latestPrice = metadata.latestPrice;

  await collection.updateOne(
    { symbol: metadata.symbol.toUpperCase() },
    {
      $set: updateFields,
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

/**
 * Get specific index metadata with latest price
 */
export async function getIndexMetadata(symbol: string): Promise<IndexMetadataDocument | null> {
  const collection = await getIndicesCollection();
  return collection.findOne({ symbol: symbol.toUpperCase() });
}

/**
 * Get all indices with their latest prices
 */
export async function getAllIndices(): Promise<IndexMetadataDocument[]> {
  const collection = await getIndicesCollection();
  return collection.find({}).sort({ symbol: 1 }).toArray();
}

/**
 * Get indices by update frequency (for scheduled updates)
 */
export async function getIndicesByFrequency(frequency: IndexUpdateFrequency): Promise<IndexMetadataDocument[]> {
  const collection = await getIndicesCollection();
  return collection.find({ updateFrequency: frequency }).toArray();
}

// ============================================================================
// Price Operations (Dual Write)
// ============================================================================

/**
 * Save index price to BOTH collections
 * - Updates latestPrice in indices collection (for fast listing)
 * - Inserts new document in index_prices collection (for history)
 */
export async function saveIndexPrice(priceData: IndexPriceData): Promise<void> {
  const [indicesCollection, pricesCollection] = await Promise.all([
    getIndicesCollection(),
    getIndexPricesCollection(),
  ]);

  const upperSymbol = priceData.indexSymbol.toUpperCase();
  const now = new Date();

  // 1. Update latestPrice in indices collection
  const latestPrice: IndexLatestPrice = {
    price: priceData.price,
    change: priceData.change,
    changePercent: priceData.changePercent,
    volume: priceData.volume,
    trades: priceData.trades,
    value: priceData.value,
    high: priceData.high,
    low: priceData.low,
    timestamp: priceData.timestamp,
    marketState: priceData.marketState,
  };

  await indicesCollection.updateOne(
    { symbol: upperSymbol },
    {
      $set: {
        latestPrice,
        lastUpdated: now,
      },
    }
  );

  // 2. Insert new document in index_prices collection (time series)
  await pricesCollection.insertOne({
    indexSymbol: upperSymbol,
    price: priceData.price,
    change: priceData.change,
    changePercent: priceData.changePercent,
    volume: priceData.volume,
    trades: priceData.trades,
    value: priceData.value,
    high: priceData.high,
    low: priceData.low,
    timestamp: priceData.timestamp,
    marketState: priceData.marketState,
  });
}

/**
 * Get latest price for an index (from indices collection)
 */
export async function getLatestIndexPrice(symbol: string): Promise<IndexLatestPrice | null> {
  const index = await getIndexMetadata(symbol);
  return index?.latestPrice || null;
}

/**
 * Get index price history for charts
 */
export async function getIndexPriceHistory(
  symbol: string,
  from?: Date,
  to?: Date,
  limit?: number
): Promise<IndexPriceDocument[]> {
  const collection = await getIndexPricesCollection();
  
  const query: any = { indexSymbol: symbol.toUpperCase() };
  
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = from;
    if (to) query.timestamp.$lte = to;
  }
  
  return collection
    .find(query)
    .sort({ timestamp: -1 })
    .limit(limit || 1000)
    .toArray();
}

// ============================================================================
// Index Composition Operations
// ============================================================================

/**
 * Auto-populate index composition from symbol listedIn data
 * Queries symbol_prices and updates indices collection
 */
export async function populateIndexComposition(indexSymbol: string): Promise<{
  symbolCount: number;
  symbols: string[];
}> {
  const db = await getDb();
  const symbolsCollection = db.collection('symbol_prices');
  const indicesCollection = await getIndicesCollection();

  const upperIndexSymbol = indexSymbol.toUpperCase();

  // Find all symbols that have this index in their listedIn field
  const docs = await symbolsCollection
    .find({
      listedIn: { $regex: `\\b${upperIndexSymbol}\\b`, $options: 'i' }
    })
    .project({ symbol: 1 })
    .toArray();

  const symbols = docs.map(doc => doc.symbol).sort();
  const symbolCount = symbols.length;

  // Update indices collection
  await indicesCollection.updateOne(
    { symbol: upperIndexSymbol },
    {
      $set: {
        symbols,
        symbolCount,
        lastUpdated: new Date(),
      },
    }
  );

  return { symbolCount, symbols };
}

/**
 * Populate all indices compositions
 */
export async function populateAllIndicesComposition(): Promise<{
  [indexSymbol: string]: { symbolCount: number; symbols: string[] };
}> {
  const indices = await getAllIndices();
  const results: any = {};

  for (const index of indices) {
    try {
      const result = await populateIndexComposition(index.symbol);
      results[index.symbol] = result;
    } catch (error) {
      console.error(`Failed to populate ${index.symbol}:`, error);
      results[index.symbol] = { symbolCount: 0, symbols: [], error: String(error) };
    }
  }

  return results;
}

/**
 * Get index composition statistics
 */
export async function getIndexStats(): Promise<{
  totalIndices: number;
  totalSymbols: number;
  indicesWithPrices: number;
  oldestPrice: Date | null;
  newestPrice: Date | null;
}> {
  const [indicesCollection, pricesCollection] = await Promise.all([
    getIndicesCollection(),
    getIndexPricesCollection(),
  ]);

  const totalIndices = await indicesCollection.countDocuments();
  const indicesWithPrices = await indicesCollection.countDocuments({
    'latestPrice': { $exists: true }
  });

  // Count total unique symbols across all indices
  const indices = await indicesCollection.find({}).project({ symbols: 1 }).toArray();
  const uniqueSymbols = new Set<string>();
  indices.forEach(idx => {
    idx.symbols?.forEach(s => uniqueSymbols.add(s));
  });

  // Get oldest and newest price timestamps
  const [oldestDoc] = await pricesCollection
    .find({})
    .sort({ timestamp: 1 })
    .limit(1)
    .toArray();

  const [newestDoc] = await pricesCollection
    .find({})
    .sort({ timestamp: -1 })
    .limit(1)
    .toArray();

  return {
    totalIndices,
    totalSymbols: uniqueSymbols.size,
    indicesWithPrices,
    oldestPrice: oldestDoc?.timestamp || null,
    newestPrice: newestDoc?.timestamp || null,
  };
}

