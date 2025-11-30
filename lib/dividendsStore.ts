/**
 * Dividends Store
 * 
 * Manages dividend payment history for stocks.
 * Supports dividend calendar, yield calculations, and income tracking.
 */

import type { Filter } from 'mongodb';
import clientPromise from './mongodb';
import { getSymbolPriceData } from './symbolsStore';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DividendRecord {
  symbol: string;
  exDate: Date;              // Ex-dividend date
  paymentDate: Date;         // Payment date
  recordDate: Date;          // Record date
  amount: number;            // Dividend amount per share
  year: number;              // Calendar year
  createdAt: Date;
}

export interface DividendSummary {
  symbol: string;
  totalDividends: number;
  dividendCount: number;
  avgDividend: number;
  lastDividend: DividendRecord | null;
  nextDividend: DividendRecord | null;
}

// ============================================================================
// Basic CRUD Functions
// ============================================================================

/**
 * Get dividend history for a specific symbol
 */
export async function getDividendHistory(
  symbol: string,
  limit?: number
): Promise<DividendRecord[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    let query = dividends
      .find({ symbol: symbol.toUpperCase() })
      .sort({ exDate: -1 });

    if (limit) {
      query = query.limit(limit);
    }

    const history = await query.toArray();

    return history;
  } catch (error) {
    console.error(`Error getting dividend history for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Save a single dividend record (upsert based on symbol + exDate)
 */
export async function saveDividend(data: DividendRecord): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    const upperSymbol = data.symbol.toUpperCase();

    const dividendData: DividendRecord = {
      ...data,
      symbol: upperSymbol,
      createdAt: data.createdAt || new Date(),
    };

    // Upsert based on symbol and exDate (unique combination)
    await dividends.updateOne(
      {
        symbol: upperSymbol,
        exDate: data.exDate,
      },
      { $set: dividendData },
      { upsert: true }
    );

    console.log(`✓ Saved dividend for ${upperSymbol}: Rs. ${data.amount} (ex: ${data.exDate.toISOString().split('T')[0]})`);
  } catch (error) {
    console.error(`Error saving dividend for ${data.symbol}:`, error);
    throw error;
  }
}

/**
 * Save multiple dividend records (batch operation)
 */
export async function saveDividendBatch(data: DividendRecord[]): Promise<number> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    if (data.length === 0) return 0;

    const symbol = data[0].symbol.toUpperCase();
    let savedCount = 0;

    // Process each dividend record
    for (const dividend of data) {
      const dividendData: DividendRecord = {
        ...dividend,
        symbol: symbol,
        createdAt: dividend.createdAt || new Date(),
      };

      const result = await dividends.updateOne(
        {
          symbol: symbol,
          exDate: dividend.exDate,
        },
        { $set: dividendData },
        { upsert: true }
      );

      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        savedCount++;
      }
    }

    console.log(`✓ Saved ${savedCount}/${data.length} dividend records for ${symbol}`);

    return savedCount;
  } catch (error) {
    console.error('Error saving dividend batch:', error);
    throw error;
  }
}

/**
 * Delete dividend record (for cleanup/testing)
 */
export async function deleteDividend(symbol: string, exDate: Date): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    await dividends.deleteOne({
      symbol: symbol.toUpperCase(),
      exDate,
    });

    console.log(`Deleted dividend for ${symbol} (ex: ${exDate.toISOString().split('T')[0]})`);
  } catch (error) {
    console.error(`Error deleting dividend for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Delete all dividends for a symbol (for cleanup/testing)
 */
export async function deleteDividendsBySymbol(symbol: string): Promise<number> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    const result = await dividends.deleteMany({ symbol: symbol.toUpperCase() });

    console.log(`Deleted ${result.deletedCount} dividend records for ${symbol}`);

    return result.deletedCount || 0;
  } catch (error) {
    console.error(`Error deleting dividends for ${symbol}:`, error);
    throw error;
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get dividends for a specific year
 */
export async function getDividendsByYear(
  symbol: string,
  year: number
): Promise<DividendRecord[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    const results = await dividends
      .find({
        symbol: symbol.toUpperCase(),
        year,
      })
      .sort({ exDate: -1 })
      .toArray();

    return results;
  } catch (error) {
    console.error(`Error getting dividends for ${symbol} in ${year}:`, error);
    throw error;
  }
}

/**
 * Get upcoming dividends (ex-dates in the future)
 */
export async function getUpcomingDividends(
  daysAhead: number = 30,
  symbols?: string[]
): Promise<DividendRecord[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const query: Filter<DividendRecord> = {
      exDate: {
        $gte: today,
        $lte: futureDate,
      },
    };

    if (symbols && symbols.length > 0) {
      query.symbol = { $in: symbols.map(s => s.toUpperCase()) };
    }

    const upcoming = await dividends
      .find(query)
      .sort({ exDate: 1 })
      .toArray();

    return upcoming;
  } catch (error) {
    console.error('Error getting upcoming dividends:', error);
    throw error;
  }
}

/**
 * Get dividend summary for a symbol
 */
export async function getDividendSummary(symbol: string): Promise<DividendSummary> {
  try {
    const history = await getDividendHistory(symbol);

    if (history.length === 0) {
      return {
        symbol: symbol.toUpperCase(),
        totalDividends: 0,
        dividendCount: 0,
        avgDividend: 0,
        lastDividend: null,
        nextDividend: null,
      };
    }

    const totalDividends = history.reduce((sum, d) => sum + d.amount, 0);
    const avgDividend = totalDividends / history.length;

    // Find last dividend (most recent ex-date in the past)
    const today = new Date();
    const pastDividends = history.filter(d => d.exDate < today);
    const lastDividend = pastDividends.length > 0 ? pastDividends[0] : null;

    // Find next dividend (nearest ex-date in the future)
    const futureDividends = history.filter(d => d.exDate >= today);
    const nextDividend = futureDividends.length > 0
      ? futureDividends[futureDividends.length - 1]
      : null;

    return {
      symbol: symbol.toUpperCase(),
      totalDividends,
      dividendCount: history.length,
      avgDividend,
      lastDividend,
      nextDividend,
    };
  } catch (error) {
    console.error(`Error getting dividend summary for ${symbol}:`, error);
    throw error;
  }
}

// ============================================================================
// Calculations
// ============================================================================

/**
 * Calculate trailing twelve-month (TTM) dividend yield
 */
export async function calculateDividendYield(
  symbol: string,
  currentPrice?: number
): Promise<number> {
  try {
    // Get current price if not provided
    let price = currentPrice;
    if (!price) {
      const priceData = await getSymbolPriceData(symbol);
      price = priceData?.currentPrice || 0;
    }

    if (price === 0) {
      return 0;
    }

    // Get dividends from last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    const ttmDividends = await dividends
      .find({
        symbol: symbol.toUpperCase(),
        exDate: { $gte: oneYearAgo },
      })
      .toArray();

    const totalDividends = ttmDividends.reduce((sum, d) => sum + d.amount, 0);
    const dividendYield = (totalDividends / price) * 100;

    return dividendYield;
  } catch (error) {
    console.error(`Error calculating dividend yield for ${symbol}:`, error);
    return 0;
  }
}

/**
 * Calculate annual dividend for a specific year
 */
export async function calculateAnnualDividend(
  symbol: string,
  year: number
): Promise<number> {
  try {
    const yearDividends = await getDividendsByYear(symbol, year);
    const total = yearDividends.reduce((sum, d) => sum + d.amount, 0);

    return total;
  } catch (error) {
    console.error(`Error calculating annual dividend for ${symbol}:`, error);
    return 0;
  }
}

/**
 * Calculate dividend growth rate (year-over-year)
 */
export async function calculateDividendGrowthRate(
  symbol: string,
  years: number = 3
): Promise<number> {
  try {
    const currentYear = new Date().getFullYear();
    const annualDividends: { year: number; total: number }[] = [];

    // Get annual dividends for the specified number of years
    for (let i = 0; i < years; i++) {
      const year = currentYear - i;
      const total = await calculateAnnualDividend(symbol, year);
      annualDividends.push({ year, total });
    }

    // Filter out years with no dividends
    const validYears = annualDividends.filter(d => d.total > 0);

    if (validYears.length < 2) {
      return 0; // Not enough data
    }

    // Calculate compound annual growth rate (CAGR)
    const firstYear = validYears[validYears.length - 1];
    const lastYear = validYears[0];
    const numYears = lastYear.year - firstYear.year;

    if (numYears === 0 || firstYear.total === 0) {
      return 0;
    }

    const cagr = (Math.pow(lastYear.total / firstYear.total, 1 / numYears) - 1) * 100;

    return cagr;
  } catch (error) {
    console.error(`Error calculating dividend growth rate for ${symbol}:`, error);
    return 0;
  }
}

// ============================================================================
// Index Management
// ============================================================================

/**
 * Ensure MongoDB indexes are created for optimal performance
 */
export async function ensureDividendIndexes(): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection('dividends');

    // Compound index for unique constraint
    await dividends.createIndex(
      { symbol: 1, exDate: -1 },
      { unique: true }
    );

    // Index for ex-date queries (dividend calendar)
    await dividends.createIndex({ exDate: 1 });

    // Index for year queries
    await dividends.createIndex({ year: 1 });

    // Index for symbol queries
    await dividends.createIndex({ symbol: 1 });

    console.log('✓ Dividend indexes ensured');
  } catch (error) {
    console.error('Error ensuring dividend indexes:', error);
    throw error;
  }
}

// ============================================================================
// Statistics & Analytics
// ============================================================================

/**
 * Get dividend statistics
 */
export async function getDividendStats(): Promise<{
  totalRecords: number;
  totalSymbols: number;
  upcomingDividends: number;
  lastUpdated: Date | null;
}> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    const today = new Date();

    const [
      totalRecords,
      uniqueSymbols,
      upcomingCount,
      mostRecent,
    ] = await Promise.all([
      dividends.countDocuments(),
      dividends.distinct('symbol'),
      dividends.countDocuments({ exDate: { $gte: today } }),
      dividends.findOne({}, { sort: { createdAt: -1 } }),
    ]);

    return {
      totalRecords,
      totalSymbols: uniqueSymbols.length,
      upcomingDividends: upcomingCount,
      lastUpdated: mostRecent?.createdAt || null,
    };
  } catch (error) {
    console.error('Error getting dividend stats:', error);
    throw error;
  }
}

/**
 * Get highest dividend-yielding stocks
 */
export async function getHighestYieldStocks(limit: number = 10): Promise<Array<{
  symbol: string;
  yield: number;
  ttmDividends: number;
  currentPrice: number;
}>> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const dividends = db.collection<DividendRecord>('dividends');

    // Get all symbols with dividends
    const symbols = await dividends.distinct('symbol');

    // Calculate yield for each symbol
    const yields: Array<{
      symbol: string;
      yield: number;
      ttmDividends: number;
      currentPrice: number;
    }> = [];

    for (const symbol of symbols) {
      const priceData = await getSymbolPriceData(symbol);
      const currentPrice = priceData?.currentPrice || 0;

      if (currentPrice === 0) continue;

      const dividendYield = await calculateDividendYield(symbol, currentPrice);

      if (dividendYield > 0) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const ttmDividends = await dividends
          .find({
            symbol,
            exDate: { $gte: oneYearAgo },
          })
          .toArray();

        const ttmTotal = ttmDividends.reduce((sum, d) => sum + d.amount, 0);

        yields.push({
          symbol,
          yield: dividendYield,
          ttmDividends: ttmTotal,
          currentPrice,
        });
      }
    }

    // Sort by yield descending and return top N
    yields.sort((a, b) => b.yield - a.yield);

    return yields.slice(0, limit);
  } catch (error) {
    console.error('Error getting highest yield stocks:', error);
    throw error;
  }
}

