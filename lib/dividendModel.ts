/**
 * Dividend Model
 * MongoDB schema and operations for dividend tracking
 */

import clientPromise from './mongodb';
import { Db, Collection, ObjectId, Filter } from 'mongodb';

export interface DividendDates {
  announcement: Date;
  exDividend: Date;
  bookClosureStart: Date;
  bookClosureEnd: Date;
  payment?: Date;
  agmDate?: Date;
}

export interface DividendFinancials {
  dividendRate?: number; // Percentage
  dividendPerShare?: number; // PKR amount
  faceValue: number; // Default 10
  totalAmount?: number; // Total payout in PKR
  bonusRatio?: string; // "1:5"
  rightRatio?: string; // "1:10"
  rightPrice?: number; // For right shares
}

export interface DividendCalculated {
  eligibilityStatus: 'Upcoming' | 'Eligible' | 'Closed';
  daysUntilPayment?: number;
  annualizedYield?: number;
}

export interface Dividend {
  _id?: ObjectId;
  symbol: string;
  companyName: string;
  sector: string;
  dividendType: 'Cash' | 'Bonus' | 'Right' | 'Stock' | 'Interim' | 'Final';
  dates: DividendDates;
  financials: DividendFinancials;
  fiscalYear?: string; // "FY2024"
  quarter?: string; // "Q2", "Q3"
  remarks?: string;
  calculated: DividendCalculated;
  source: string;
  uploadedBy?: string; // User email
  uploadedAt: Date;
  updatedAt?: Date;
}

export interface DividendFilter {
  symbol?: string | string[];
  sector?: string;
  dividendType?: Dividend['dividendType'];
  startDate?: Date;
  endDate?: Date;
  eligibilityStatus?: string;
  uploadedBy?: string;
  page?: number;
  limit?: number;
}

const DB_NAME = process.env.MONGODB_DB || 'portfolioTrack';
const paymentDividends = "paymentDividends"

async function getCollection(name = paymentDividends): Promise<Collection<Dividend>> {
  const client = await clientPromise;
  const db: Db = client.db(DB_NAME);
  return db.collection<Dividend>(name);
}

/**
 * Initialize indexes
 */
export async function initializeDividendIndexes() {
  const collection = await getCollection();

  await collection.createIndex({ symbol: 1, 'dates.announcement': -1 });
  await collection.createIndex({ 'dates.exDividend': 1 });
  await collection.createIndex({ sector: 1, dividendType: 1 });
  await collection.createIndex({ 'dates.payment': 1 });
  await collection.createIndex({ uploadedBy: 1 });
  await collection.createIndex({ 'calculated.eligibilityStatus': 1 });
}

/**
 * Calculate eligibility status based on dates
 */
export function calculateEligibilityStatus(dates: DividendDates): 'Upcoming' | 'Eligible' | 'Closed' {
  const now = new Date();
  const exDividend = new Date(dates.exDividend);
  const bookClosureEnd = new Date(dates.bookClosureEnd);

  if (now < exDividend) {
    return 'Upcoming';
  } else if (now >= exDividend && now <= bookClosureEnd) {
    return 'Eligible';
  } else {
    return 'Closed';
  }
}

/**
 * Calculate days until payment
 */
export function calculateDaysUntilPayment(paymentDate?: Date): number | undefined {
  if (!paymentDate) return undefined;

  const now = new Date();
  const payment = new Date(paymentDate);
  const diffTime = payment.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : undefined;
}

/**
 * Create a new dividend record
 */
export async function createDividend(userId: string, dividend: Omit<Dividend, '_id' | 'uploadedAt' | 'calculated'>): Promise<Dividend> {
  const collection = await getCollection();

  const calculated: DividendCalculated = {
    eligibilityStatus: calculateEligibilityStatus(dividend.dates),
    daysUntilPayment: calculateDaysUntilPayment(dividend.dates.payment),
  };

  const newDividend: Dividend = {
    ...dividend,
    uploadedBy: userId,
    uploadedAt: new Date(),
    calculated,
  };

  const result = await collection.insertOne(newDividend);
  return { ...newDividend, _id: result.insertedId };
}

/**
 * Create multiple dividend records (bulk upload)
 */
export async function createDividendsBulk(userId: string, dividends: Omit<Dividend, '_id' | 'uploadedAt' | 'calculated'>[]): Promise<{ insertedCount: number; insertedIds: ObjectId[] }> {
  const collection = await getCollection();

  const newDividends = dividends.map(dividend => {
    const calculated: DividendCalculated = {
      eligibilityStatus: calculateEligibilityStatus(dividend.dates),
      daysUntilPayment: calculateDaysUntilPayment(dividend.dates.payment),
    };

    return {
      ...dividend,
      uploadedBy: userId,
      uploadedAt: new Date(),
      calculated,
    };
  });

  const result = await collection.insertMany(newDividends);
  return {
    insertedCount: result.insertedCount,
    insertedIds: Object.values(result.insertedIds),
  };
}

/**
 * Get dividends with filtering and pagination
 */
export async function getDividends(filter: DividendFilter): Promise<{ dividends: Dividend[]; total: number }> {
  const collection = await getCollection(paymentDividends);

  const query: Filter<Dividend> = {};

  if (filter.symbol) {
    if (Array.isArray(filter.symbol)) {
      query.symbol = { $in: filter.symbol.map(s => s.toUpperCase()) };
    } else {
      query.symbol = filter.symbol.toUpperCase();
    }
  }

  if (filter.sector) {
    query.sector = filter.sector;
  }

  if (filter.dividendType) {
    query.dividendType = filter.dividendType;
  }

  if (false && filter.eligibilityStatus) {
    query['calculated.eligibilityStatus'] = filter.eligibilityStatus;
  }

  if (filter.startDate || filter.endDate) {
    query['dates.announcement'] = {};
    if (filter.startDate) query['dates.announcement'].$gte = filter.startDate;
    if (filter.endDate) query['dates.announcement'].$lte = filter.endDate;
  }

  if (filter.uploadedBy) {
    query.uploadedBy = filter.uploadedBy;
  }

  const page = filter.page || 1;
  const limit = filter.limit || 50;
  const skip = (page - 1) * limit;

  console.log(`[DB] Querying dividends:`, JSON.stringify(query));

  const [dividends, total] = await Promise.all([
    collection.find(query)
      .sort({ 'dates.announcement': -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return { dividends, total };
}

/**
 * Get dividend by ID
 */
export async function getDividendById(id: string): Promise<Dividend | null> {
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Get all dividends for a symbol
 */
export async function getDividendsBySymbol(symbol: string): Promise<Dividend[]> {
  const collection = await getCollection();
  return collection.find({ symbol: symbol.toUpperCase() })
    .sort({ 'dates.announcement': -1 })
    .toArray();
}

/**
 * Get upcoming dividends (ex-dividend date in the future)
 */
export async function getUpcomingDividends(days: number = 30, symbols?: string[]): Promise<Dividend[]> {
  const collection = await getCollection();
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);

  const query: Filter<Dividend> = {
    'dates.exDividend': { $gte: now, $lte: futureDate },
  };

  if (symbols && symbols.length > 0) {
    query.symbol = { $in: symbols.map(s => s.toUpperCase()) };
  }

  return collection.find(query)
    .sort({ 'dates.exDividend': 1 })
    .toArray();
}

/**
 * Get dividends for user's portfolio symbols
 */
export async function getPortfolioDividends(symbols: string[]): Promise<Dividend[]> {
  const collection = await getCollection();
  const upperSymbols = symbols.map(s => s.toUpperCase());

  return collection.find({
    symbol: { $in: upperSymbols },
    'calculated.eligibilityStatus': { $in: ['Upcoming', 'Eligible'] },
  })
    .sort({ 'dates.exDividend': 1 })
    .toArray();
}

/**
 * Update a dividend record
 */
export async function updateDividend(id: string, updates: Partial<Omit<Dividend, '_id' | 'uploadedAt'>>): Promise<boolean> {
  const collection = await getCollection();

  // Recalculate if dates are updated
  if (updates.dates) {
    updates.calculated = {
      ...updates.calculated,
      eligibilityStatus: calculateEligibilityStatus(updates.dates),
      daysUntilPayment: calculateDaysUntilPayment(updates.dates.payment),
    };
  }

  updates.updatedAt = new Date();

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete a dividend record
 */
export async function deleteDividend(id: string): Promise<boolean> {
  const collection = await getCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

/**
 * Check for duplicate dividend (same symbol and announcement date)
 */
export async function checkDuplicateDividend(symbol: string, announcementDate: Date): Promise<Dividend | null> {
  const collection = await getCollection();
  return collection.findOne({
    symbol: symbol.toUpperCase(),
    'dates.announcement': announcementDate,
  });
}

/**
 * Update calculated fields for all dividends (maintenance task)
 */
export async function updateCalculatedFields(): Promise<number> {
  const collection = await getCollection();
  const dividends = await collection.find({}).toArray();

  let updated = 0;

  for (const dividend of dividends) {
    const calculated: DividendCalculated = {
      eligibilityStatus: calculateEligibilityStatus(dividend.dates),
      daysUntilPayment: calculateDaysUntilPayment(dividend.dates.payment),
    };

    await collection.updateOne(
      { _id: dividend._id },
      { $set: { calculated } }
    );

    updated++;
  }

  return updated;
}
