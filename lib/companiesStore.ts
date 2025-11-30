/**
 * Company Data Store
 * 
 * Manages company fundamentals data including free float, key people,
 * and business descriptions. Also tracks free float changes over time.
 */

import clientPromise from './mongodb';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CompanyData {
  symbol: string;              // Primary key
  marketCap: number;
  shares: number;
  freeFloat: number;
  freeFloatPercent: number;
  businessDescription: string;
  keyPeople: Array<{
    name: string;
    position: string;
  }>;
  scrapedAt: Date;
  lastUpdated: Date;
}

export interface FreeFloatHistoryEntry {
  symbol: string;
  freeFloat: number;
  freeFloatPercent: number;
  changedAt: Date;
}

// ============================================================================
// Company Data Functions
// ============================================================================

/**
 * Get company data for a specific symbol
 */
export async function getCompanyData(symbol: string): Promise<CompanyData | null> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const companies = db.collection<CompanyData>('companies');

    const company = await companies.findOne({ symbol: symbol.toUpperCase() });

    return company;
  } catch (error) {
    console.error(`Error getting company data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get all companies
 */
export async function getAllCompanies(): Promise<CompanyData[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const companies = db.collection<CompanyData>('companies');

    const allCompanies = await companies
      .find({})
      .sort({ symbol: 1 })
      .toArray();

    return allCompanies;
  } catch (error) {
    console.error('Error getting all companies:', error);
    throw error;
  }
}

/**
 * Get companies by symbols (batch query)
 */
export async function getCompaniesBySymbols(symbols: string[]): Promise<CompanyData[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const companies = db.collection<CompanyData>('companies');

    const upperSymbols = symbols.map(s => s.toUpperCase());

    const result = await companies
      .find({ symbol: { $in: upperSymbols } })
      .toArray();

    return result;
  } catch (error) {
    console.error('Error getting companies by symbols:', error);
    throw error;
  }
}

/**
 * Save or update company data
 * Also tracks free float changes if different from existing
 */
export async function saveCompanyData(data: CompanyData): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const companies = db.collection<CompanyData>('companies');

    const upperSymbol = data.symbol.toUpperCase();

    // Get existing company data to check for free float changes
    const existing = await companies.findOne({ symbol: upperSymbol });

    // Prepare the updated data
    const updatedData: CompanyData = {
      ...data,
      symbol: upperSymbol,
      lastUpdated: new Date(),
    };

    // Upsert company data
    await companies.updateOne(
      { symbol: upperSymbol },
      { $set: updatedData },
      { upsert: true }
    );

    // Track free float change if it changed
    if (existing && existing.freeFloat !== data.freeFloat) {
      await trackFreeFloatChange(
        upperSymbol,
        data.freeFloat,
        data.freeFloatPercent
      );
    }

    console.log(`✓ Saved company data for ${upperSymbol}`);
  } catch (error) {
    console.error(`Error saving company data for ${data.symbol}:`, error);
    throw error;
  }
}

/**
 * Track free float change in history
 */
export async function trackFreeFloatChange(
  symbol: string,
  freeFloat: number,
  freeFloatPercent: number
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const history = db.collection<FreeFloatHistoryEntry>('company_freefloat_history');

    const entry: FreeFloatHistoryEntry = {
      symbol: symbol.toUpperCase(),
      freeFloat,
      freeFloatPercent,
      changedAt: new Date(),
    };

    await history.insertOne(entry);

    console.log(`📊 Tracked free float change for ${symbol}: ${freeFloatPercent}%`);
  } catch (error) {
    console.error(`Error tracking free float change for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get free float change history for a symbol
 */
export async function getFreeFloatHistory(
  symbol: string,
  limit: number = 10
): Promise<FreeFloatHistoryEntry[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const history = db.collection<FreeFloatHistoryEntry>('company_freefloat_history');

    const entries = await history
      .find({ symbol: symbol.toUpperCase() })
      .sort({ changedAt: -1 })
      .limit(limit)
      .toArray();

    return entries;
  } catch (error) {
    console.error(`Error getting free float history for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Delete company data (for cleanup/testing)
 */
export async function deleteCompanyData(symbol: string): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const companies = db.collection<CompanyData>('companies');

    await companies.deleteOne({ symbol: symbol.toUpperCase() });

    console.log(`Deleted company data for ${symbol}`);
  } catch (error) {
    console.error(`Error deleting company data for ${symbol}:`, error);
    throw error;
  }
}

// ============================================================================
// Index Management
// ============================================================================

/**
 * Ensure MongoDB indexes are created for optimal performance
 * Call this on app initialization or via a setup script
 */
export async function ensureCompanyIndexes(): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');

    // Companies collection indexes
    const companies = db.collection('companies');
    await companies.createIndex({ symbol: 1 }, { unique: true });
    await companies.createIndex({ lastUpdated: 1 });

    // Free float history collection indexes
    const history = db.collection('company_freefloat_history');
    await history.createIndex({ symbol: 1, changedAt: -1 });
    await history.createIndex({ changedAt: -1 });

    console.log('✓ Company indexes ensured');
  } catch (error) {
    console.error('Error ensuring company indexes:', error);
    throw error;
  }
}

// ============================================================================
// Statistics & Analytics
// ============================================================================

/**
 * Get statistics about stored companies
 */
export async function getCompanyStats(): Promise<{
  totalCompanies: number;
  lastUpdated: Date | null;
  symbolsWithFreeFloatHistory: number;
}> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const companies = db.collection<CompanyData>('companies');
    const history = db.collection('company_freefloat_history');

    const [
      totalCompanies,
      mostRecent,
      symbolsWithHistory,
    ] = await Promise.all([
      companies.countDocuments(),
      companies.findOne({}, { sort: { lastUpdated: -1 } }),
      history.distinct('symbol'),
    ]);

    return {
      totalCompanies,
      lastUpdated: mostRecent?.lastUpdated || null,
      symbolsWithFreeFloatHistory: symbolsWithHistory.length,
    };
  } catch (error) {
    console.error('Error getting company stats:', error);
    throw error;
  }
}

/**
 * Get companies with highest free float percentage
 */
export async function getHighestFreeFloat(limit: number = 10): Promise<CompanyData[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const companies = db.collection<CompanyData>('companies');

    const results = await companies
      .find({})
      .sort({ freeFloatPercent: -1 })
      .limit(limit)
      .toArray();

    return results;
  } catch (error) {
    console.error('Error getting highest free float:', error);
    throw error;
  }
}

/**
 * Get companies with lowest free float percentage
 */
export async function getLowestFreeFloat(limit: number = 10): Promise<CompanyData[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const companies = db.collection<CompanyData>('companies');

    const results = await companies
      .find({})
      .sort({ freeFloatPercent: 1 })
      .limit(limit)
      .toArray();

    return results;
  } catch (error) {
    console.error('Error getting lowest free float:', error);
    throw error;
  }
}

