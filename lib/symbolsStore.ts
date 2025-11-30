import type { AnyBulkWriteOperation, Collection, Db } from 'mongodb';
import clientPromise from './mongodb';

export interface SymbolPriceData {
  symbol: string;

  // Basic Metadata (from symbols.ts)
  name?: string;
  sectorName?: string;
  isETF?: boolean;
  isDebt?: boolean;
  isGEM?: boolean;

  // Index & Fundamental Data (from PSX Terminal API)
  listedIn?: string;           // Index membership (e.g., "KSE100", "KMI30,KSE100")
  marketCapString?: string;    // Market cap with units (e.g., "511.4M", "1.2B")
  freeFloatString?: string;    // Free float with units (e.g., "11.9M")
  volume30Avg?: number;        // 30-day average volume
  yearChange?: number;         // Year-to-date change %
  isNonCompliant?: boolean;    // Compliance status

  // Price Data
  currentPrice?: number;
  priceOpen?: number;
  priceClose?: number;
  priceHigh?: number;
  priceLow?: number;
  dayRangeLow?: number;
  dayRangeHigh?: number;
  weekRange52Low?: number;
  weekRange52High?: number;
  priceChange?: number;
  priceChangePercent?: number;

  // Volume & Trading
  volume?: number;
  weeklyAverageVolume?: number;
  trades?: number;
  value?: number;

  // Market Metrics
  marketCap?: number;
  sharesOutstanding?: number;
  freeFloatShares?: number;
  freeFloatPercent?: number;

  // Valuation & Financial Ratios
  peRatio?: number;
  pbRatio?: number;
  dividendYield?: number;
  earningsPerShare?: number;
  netIncomeMargin?: number;

  // Circuit Breakers
  circuitBreakerLower?: number;
  circuitBreakerUpper?: number;

  // Bid/Ask Data
  bidPrice?: number;
  askPrice?: number;
  bidVolume?: number;
  askVolume?: number;

  // Metadata
  lastFetchedAt?: Date;
}


export interface SymbolPriceDocument extends SymbolPriceData {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;
}

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
}

const SYMBOL_PRICES_COLLECTION = 'symbol_prices';

async function getSymbolPricesCollection(): Promise<Collection<SymbolPriceDocument>> {
  const db = await getDb();
  const collection = db.collection<SymbolPriceDocument>(SYMBOL_PRICES_COLLECTION);
  await collection.createIndex({ symbol: 1 }, { unique: true });
  await collection.createIndex({ lastFetchedAt: -1 });
  return collection;
}

export async function saveSymbolPriceData(data: SymbolPriceData): Promise<void> {
  const collection = await getSymbolPricesCollection();
  const now = new Date();

  const updateFields: Partial<SymbolPriceDocument> = {
    symbol: data.symbol.toUpperCase(),
    updatedAt: now,
  };

  // Only update metadata fields if provided
  if (data.name !== undefined) updateFields.name = data.name;
  if (data.sectorName !== undefined) updateFields.sectorName = data.sectorName;
  if (data.isETF !== undefined) updateFields.isETF = data.isETF;
  if (data.isDebt !== undefined) updateFields.isDebt = data.isDebt;
  if (data.isGEM !== undefined) updateFields.isGEM = data.isGEM;
  if (data.isNonCompliant !== undefined) updateFields.isNonCompliant = data.isNonCompliant;

  // Price Data
  if (data.currentPrice !== undefined) updateFields.currentPrice = data.currentPrice;
  if (data.priceOpen !== undefined) updateFields.priceOpen = data.priceOpen;
  if (data.priceClose !== undefined) updateFields.priceClose = data.priceClose;
  if (data.priceHigh !== undefined) updateFields.priceHigh = data.priceHigh;
  if (data.priceLow !== undefined) updateFields.priceLow = data.priceLow;
  if (data.dayRangeLow !== undefined) updateFields.dayRangeLow = data.dayRangeLow;
  if (data.dayRangeHigh !== undefined) updateFields.dayRangeHigh = data.dayRangeHigh;
  if (data.weekRange52Low !== undefined) updateFields.weekRange52Low = data.weekRange52Low;
  if (data.weekRange52High !== undefined) updateFields.weekRange52High = data.weekRange52High;
  if (data.priceChange !== undefined) updateFields.priceChange = data.priceChange;
  if (data.priceChangePercent !== undefined) updateFields.priceChangePercent = data.priceChangePercent;

  // Volume & Trading
  if (data.volume !== undefined) updateFields.volume = data.volume;
  if (data.weeklyAverageVolume !== undefined) updateFields.weeklyAverageVolume = data.weeklyAverageVolume;
  if (data.trades !== undefined) updateFields.trades = data.trades;
  if (data.value !== undefined) updateFields.value = data.value;

  // Market Metrics
  if (data.marketCap !== undefined) updateFields.marketCap = data.marketCap;
  if (data.sharesOutstanding !== undefined) updateFields.sharesOutstanding = data.sharesOutstanding;
  if (data.freeFloatShares !== undefined) updateFields.freeFloatShares = data.freeFloatShares;
  if (data.freeFloatPercent !== undefined) updateFields.freeFloatPercent = data.freeFloatPercent;

  // Valuation & Financial Ratios
  if (data.peRatio !== undefined) updateFields.peRatio = data.peRatio;
  if (data.pbRatio !== undefined) updateFields.pbRatio = data.pbRatio;
  if (data.dividendYield !== undefined) updateFields.dividendYield = data.dividendYield;
  if (data.earningsPerShare !== undefined) updateFields.earningsPerShare = data.earningsPerShare;
  if (data.netIncomeMargin !== undefined) updateFields.netIncomeMargin = data.netIncomeMargin;

  // Circuit Breakers
  if (data.circuitBreakerLower !== undefined) updateFields.circuitBreakerLower = data.circuitBreakerLower;
  if (data.circuitBreakerUpper !== undefined) updateFields.circuitBreakerUpper = data.circuitBreakerUpper;

  // Bid/Ask Data
  if (data.bidPrice !== undefined) updateFields.bidPrice = data.bidPrice;
  if (data.askPrice !== undefined) updateFields.askPrice = data.askPrice;
  if (data.bidVolume !== undefined) updateFields.bidVolume = data.bidVolume;
  if (data.askVolume !== undefined) updateFields.askVolume = data.askVolume;

  // Metadata
  if (data.lastFetchedAt !== undefined) updateFields.lastFetchedAt = data.lastFetchedAt;

  await collection.updateOne(
    { symbol: data.symbol.toUpperCase() },
    {
      $set: updateFields,
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

export async function getSymbolPriceData(symbol: string): Promise<SymbolPriceDocument | null> {
  const collection = await getSymbolPricesCollection();
  return collection.findOne({ symbol: symbol.toUpperCase() });
}

/**
 * Batch save symbol price data using MongoDB bulkWrite for better performance
 * This is much faster than calling saveSymbolPriceData multiple times
 */
export async function batchSaveSymbolPriceData(updates: SymbolPriceData[]): Promise<{
  updated: number;
  total: number;
  errors: string[];
}> {
  if (updates.length === 0) {
    return { updated: 0, total: 0, errors: [] };
  }

  const collection = await getSymbolPricesCollection();
  const now = new Date();
  const operations: AnyBulkWriteOperation<SymbolPriceDocument>[] = [];
  const errors: string[] = [];

  for (const data of updates) {
    if (!data.symbol) {
      errors.push('Missing symbol in update');
      continue;
    }

    const symbol = data.symbol.toUpperCase();
    const updateFields: Partial<SymbolPriceDocument> = {
      symbol,
      updatedAt: now,
    };

    // Only update fields that are provided (same logic as saveSymbolPriceData)
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.sectorName !== undefined) updateFields.sectorName = data.sectorName;
    if (data.isETF !== undefined) updateFields.isETF = data.isETF;
    if (data.isDebt !== undefined) updateFields.isDebt = data.isDebt;
    if (data.isGEM !== undefined) updateFields.isGEM = data.isGEM;
    if (data.isNonCompliant !== undefined) updateFields.isNonCompliant = data.isNonCompliant;

    // Price Data
    if (data.currentPrice !== undefined) updateFields.currentPrice = data.currentPrice;
    if (data.priceOpen !== undefined) updateFields.priceOpen = data.priceOpen;
    if (data.priceClose !== undefined) updateFields.priceClose = data.priceClose;
    if (data.priceHigh !== undefined) updateFields.priceHigh = data.priceHigh;
    if (data.priceLow !== undefined) updateFields.priceLow = data.priceLow;
    if (data.dayRangeLow !== undefined) updateFields.dayRangeLow = data.dayRangeLow;
    if (data.dayRangeHigh !== undefined) updateFields.dayRangeHigh = data.dayRangeHigh;
    if (data.weekRange52Low !== undefined) updateFields.weekRange52Low = data.weekRange52Low;
    if (data.weekRange52High !== undefined) updateFields.weekRange52High = data.weekRange52High;
    if (data.priceChange !== undefined) updateFields.priceChange = data.priceChange;
    if (data.priceChangePercent !== undefined) updateFields.priceChangePercent = data.priceChangePercent;

    // Volume & Trading
    if (data.volume !== undefined) updateFields.volume = data.volume;
    if (data.weeklyAverageVolume !== undefined) updateFields.weeklyAverageVolume = data.weeklyAverageVolume;
    if (data.trades !== undefined) updateFields.trades = data.trades;
    if (data.value !== undefined) updateFields.value = data.value;

    // Market Metrics
    if (data.marketCap !== undefined) updateFields.marketCap = data.marketCap;
    if (data.sharesOutstanding !== undefined) updateFields.sharesOutstanding = data.sharesOutstanding;
    if (data.freeFloatShares !== undefined) updateFields.freeFloatShares = data.freeFloatShares;
    if (data.freeFloatPercent !== undefined) updateFields.freeFloatPercent = data.freeFloatPercent;

    // Valuation & Financial Ratios
    if (data.peRatio !== undefined) updateFields.peRatio = data.peRatio;
    if (data.pbRatio !== undefined) updateFields.pbRatio = data.pbRatio;
    if (data.dividendYield !== undefined) updateFields.dividendYield = data.dividendYield;
    if (data.earningsPerShare !== undefined) updateFields.earningsPerShare = data.earningsPerShare;
    if (data.netIncomeMargin !== undefined) updateFields.netIncomeMargin = data.netIncomeMargin;

    // Circuit Breakers
    if (data.circuitBreakerLower !== undefined) updateFields.circuitBreakerLower = data.circuitBreakerLower;
    if (data.circuitBreakerUpper !== undefined) updateFields.circuitBreakerUpper = data.circuitBreakerUpper;

    // Bid/Ask Data
    if (data.bidPrice !== undefined) updateFields.bidPrice = data.bidPrice;
    if (data.askPrice !== undefined) updateFields.askPrice = data.askPrice;
    if (data.bidVolume !== undefined) updateFields.bidVolume = data.bidVolume;
    if (data.askVolume !== undefined) updateFields.askVolume = data.askVolume;

    // Metadata
    if (data.lastFetchedAt !== undefined) updateFields.lastFetchedAt = data.lastFetchedAt;

    operations.push({
      updateOne: {
        filter: { symbol },
        update: {
          $set: updateFields,
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    });
  }

  if (operations.length === 0) {
    return { updated: 0, total: updates.length, errors };
  }

  try {
    // Use ordered: false for better performance - operations can run in parallel
    const result = await collection.bulkWrite(operations, { ordered: false });
    return {
      updated: result.modifiedCount + result.upsertedCount,
      total: updates.length,
      errors,
    };
  } catch (error) {
    console.error('Error in batchSaveSymbolPriceData:', error);
    // Even with errors, some operations may succeed
    let updated = 0;
    const err = error as { result?: { nModified?: number; nUpserted?: number }; writeErrors?: { index: number; errmsg: string }[] };
    if (err.result) {
      updated = (err.result.nModified || 0) + (err.result.nUpserted || 0);
      // Extract individual write errors if available
      if (err.writeErrors && Array.isArray(err.writeErrors)) {
        for (const writeError of err.writeErrors) {
          errors.push(`Operation ${writeError.index}: ${writeError.errmsg || 'Unknown error'}`);
        }
      }
    } else {
      // If no result object, add the error message
      errors.push(error instanceof Error ? error.message : 'Unknown error in batch update');
    }
    return {
      updated,
      total: updates.length,
      errors,
    };
  }
}

/**
 * Batch fetch symbol metadata for multiple symbols
 * Returns a map of symbol -> metadata for easy lookup
 */
export async function batchGetSymbolMetadata(symbols: string[]): Promise<Map<string, SymbolPriceDocument>> {
  if (symbols.length === 0) {
    return new Map();
  }

  const collection = await getSymbolPricesCollection();
  const upperSymbols = symbols.map(s => s.toUpperCase());

  const docs = await collection
    .find({ symbol: { $in: upperSymbols } })
    .project({
      symbol: 1,
      name: 1,
      sectorName: 1,
      isETF: 1,
      isDebt: 1,
      isGEM: 1,
      currentPrice: 1,
      priceChange: 1,
      priceChangePercent: 1,
      isNonCompliant: 1,
      listedIn: 1
    })
    .toArray();

  const metadataMap = new Map<string, SymbolPriceDocument>();
  docs.forEach((doc) => {
    metadataMap.set(doc.symbol, doc as unknown as SymbolPriceDocument);
  });

  return metadataMap;
}

/**
 * Sync symbols from static data file (lib/symbols.ts) to MongoDB
 * Updates existing symbols with metadata, creates new ones with default price values
 */
export async function syncSymbolsFromStaticData(): Promise<{
  total: number;
  created: number;
  updated: number;
  errors: number;
}> {
  const { symbols } = await import('./symbols');
  const collection = await getSymbolPricesCollection();

  const operations: AnyBulkWriteOperation<SymbolPriceDocument>[] = [];
  const now = new Date();

  for (const symbolData of symbols) {
    if (!symbolData.symbol) continue;

    const symbol = symbolData.symbol.toUpperCase();

    operations.push({
      updateOne: {
        filter: { symbol },
        update: {
          $set: {
            symbol,
            name: symbolData.name || '',
            sectorName: symbolData.sectorName || '',
            isETF: symbolData.isETF || false,
            isDebt: symbolData.isDebt || false,
            isGEM: symbolData.isGEM || false,
            updatedAt: now,
          },
          $setOnInsert: {
            // Set default null values for price fields on insert
            currentPrice: null,
            priceOpen: null,
            priceClose: null,
            priceHigh: null,
            priceLow: null,
            dayRangeLow: null,
            dayRangeHigh: null,
            weekRange52Low: null,
            weekRange52High: null,
            priceChange: null,
            priceChangePercent: null,
            volume: null,
            weeklyAverageVolume: null,
            trades: null,
            value: null,
            marketCap: null,
            sharesOutstanding: null,
            freeFloatShares: null,
            freeFloatPercent: null,
            peRatio: null,
            pbRatio: null,
            dividendYield: null,
            earningsPerShare: null,
            netIncomeMargin: null,
            circuitBreakerLower: null,
            circuitBreakerUpper: null,
            bidPrice: null,
            askPrice: null,
            bidVolume: null,
            askVolume: null,
            lastFetchedAt: null,
            createdAt: now,
          },
        },
        upsert: true,
      },
    });
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  if (operations.length > 0) {
    try {
      const result = await collection.bulkWrite(operations, { ordered: false });
      created = result.upsertedCount;
      updated = result.modifiedCount;
    } catch (error) {
      // Even with errors, some operations may succeed
      const err = error as { result?: { nUpserted?: number; nModified?: number }; writeErrors?: { length: number }; message: string };
      if (err.result) {
        created = err.result.nUpserted || 0;
        updated = err.result.nModified || 0;
      }
      errors = err.writeErrors?.length || 0;
      console.error('Bulk write errors:', err.message);
    }
  }

  return {
    total: operations.length,
    created,
    updated,
    errors,
  };
}

/**
 * Get statistics about cached symbol prices in the database
 */
export async function getSymbolPriceStats(): Promise<{
  totalSymbols: number;
  oldestCache: Date | null;
  latestCache: Date | null;
}> {
  const collection = await getSymbolPricesCollection();

  const totalSymbols = await collection.countDocuments();

  if (totalSymbols === 0) {
    return {
      totalSymbols: 0,
      oldestCache: null,
      latestCache: null,
    };
  }

  // Find oldest and latest cache timestamps
  const [oldestDoc] = await collection
    .find({ lastFetchedAt: { $exists: true, $ne: null } })
    .sort({ lastFetchedAt: 1 })
    .limit(1)
    .toArray();

  const [latestDoc] = await collection
    .find({ lastFetchedAt: { $exists: true, $ne: null } })
    .sort({ lastFetchedAt: -1 })
    .limit(1)
    .toArray();

  return {
    totalSymbols,
    oldestCache: oldestDoc?.lastFetchedAt || null,
    latestCache: latestDoc?.lastFetchedAt || null,
  };
}

/**
 * Refresh symbol prices from PSX Terminal API
 * Fetches latest prices for all provided symbols and updates database
 * @param symbols Array of symbols to refresh
 * @returns Count of successfully updated symbols
 */
export async function refreshSymbolPrices(symbols: string[]): Promise<number> {
  if (symbols.length === 0) {
    return 0;
  }

  let successCount = 0;

  // Fetch prices from API with delay to avoid rate limiting
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i].toUpperCase();

    try {
      // Fetch from PSX Terminal API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || 'https://psxterminal.com/api'}/ticks/REG/${symbol}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://psxterminal.com/',
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch price for ${symbol}: ${response.status}`);
        continue;
      }

      const result = await response.json();
      console.log('result', result);
      if (result.success && result.data) {
        const apiData = result.data;
        console.log('apiData price', apiData.price);
        // Transform and save to database
        const symbolPriceData = {
          symbol: symbol,
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
        successCount++;
      }
    } catch (error) {
      console.error(`Error refreshing price for ${symbol}:`, error);
    }

    // Add delay between requests to avoid rate limiting
    if (i < symbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return successCount;
}

/**
 * Parse market cap or free float string to numeric value
 * Examples: "511.4M" -> 511400000, "1.2B" -> 1200000000, "10.5K" -> 10500
 */
function parseNumericValue(value: string | undefined): number | undefined {
  if (!value || typeof value !== 'string') return undefined;

  const cleaned = value.trim().toUpperCase();
  const match = cleaned.match(/^([\d.]+)([KMB]?)$/);

  if (!match) return undefined;

  const number = parseFloat(match[1]);
  const unit = match[2];

  if (isNaN(number)) return undefined;

  switch (unit) {
    case 'K':
      return number * 1_000;
    case 'M':
      return number * 1_000_000;
    case 'B':
      return number * 1_000_000_000;
    default:
      return number;
  }
}

/**
 * Get all symbols that belong to a specific index
 * @param indexName Index name (e.g., "KSE100", "KMI30")
 * @returns Array of symbols in that index
 */
export async function getSymbolsByIndex(indexName: string): Promise<string[]> {
  const collection = await getSymbolPricesCollection();

  // Query for symbols where listedIn contains the index name
  // This works with comma-separated strings like "ALLSHR,KSE100,KMI30"
  const docs = await collection
    .find({
      listedIn: { $regex: indexName, $options: 'i' }
    })
    .project({ symbol: 1 })
    .toArray();

  return docs.map(doc => doc.symbol);
}

/**
 * Get all indices that a symbol belongs to
 * @param symbol Stock symbol
 * @returns Array of index names (e.g., ["KSE100", "KMI30", "ALLSHR"])
 */
export async function getSymbolIndices(symbol: string): Promise<string[]> {
  const doc = await getSymbolPriceData(symbol);

  if (!doc?.listedIn) return [];

  // Parse comma-separated string
  return doc.listedIn.split(',').map(idx => idx.trim()).filter(idx => idx.length > 0);
}

/**
 * Get count of symbols in each index
 * @returns Map of index name -> count
 */
export async function getIndexComposition(): Promise<Map<string, number>> {
  const collection = await getSymbolPricesCollection();

  const docs = await collection
    .find({ listedIn: { $exists: true, $ne: '' } })
    .project({ listedIn: 1 })
    .toArray();

  const indexCounts = new Map<string, number>();

  docs.forEach(doc => {
    if (doc.listedIn) {
      const indices = doc.listedIn.split(',').map(idx => idx.trim());
      indices.forEach(idx => {
        if (idx) {
          indexCounts.set(idx, (indexCounts.get(idx) || 0) + 1);
        }
      });
    }
  });

  return indexCounts;
}

/**
 * Update symbol with fundamental data from PSX Terminal API
 */
export async function updateSymbolFundamentals(
  symbol: string,
  fundamentals: {
    listedIn?: string;
    marketCap?: string;
    peRatio?: number;
    dividendYield?: number;
    freeFloat?: string;
    volume30Avg?: number;
    yearChange?: number;
    isNonCompliant?: boolean;
    price?: number;
    changePercent?: number;
  }
): Promise<void> {
  const collection = await getSymbolPricesCollection();
  const now = new Date();

  const updateFields: Partial<SymbolPriceDocument> = {
    symbol: symbol.toUpperCase(),
    updatedAt: now,
  };

  // Fundamental data
  if (fundamentals.listedIn !== undefined) updateFields.listedIn = fundamentals.listedIn;
  if (fundamentals.marketCap !== undefined) {
    updateFields.marketCapString = fundamentals.marketCap;
    const parsed = parseNumericValue(fundamentals.marketCap);
    if (parsed !== undefined) updateFields.marketCap = parsed;
  }
  if (fundamentals.freeFloat !== undefined) {
    updateFields.freeFloatString = fundamentals.freeFloat;
    const parsed = parseNumericValue(fundamentals.freeFloat);
    if (parsed !== undefined) updateFields.freeFloatShares = parsed;
  }
  if (fundamentals.peRatio !== undefined) updateFields.peRatio = fundamentals.peRatio;
  if (fundamentals.dividendYield !== undefined) updateFields.dividendYield = fundamentals.dividendYield;
  if (fundamentals.volume30Avg !== undefined) updateFields.volume30Avg = fundamentals.volume30Avg;
  if (fundamentals.yearChange !== undefined) updateFields.yearChange = fundamentals.yearChange;
  if (fundamentals.isNonCompliant !== undefined) updateFields.isNonCompliant = fundamentals.isNonCompliant;

  // Also update price data if provided
  if (fundamentals.price !== undefined) updateFields.currentPrice = fundamentals.price;
  if (fundamentals.changePercent !== undefined) updateFields.priceChangePercent = fundamentals.changePercent;

  await collection.updateOne(
    { symbol: symbol.toUpperCase() },
    {
      $set: updateFields,
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

