/**
 * Payment Dividend Model
 * MongoDB schema and operations for dividend payment tracking
 */

import clientPromise from './mongodb';
import { Db, Collection, ObjectId } from 'mongodb';

export interface PaymentDividend {
  _id?: ObjectId;
  paymentDate: Date;
  symbol: string;
  companyName: string;
  warrantNo: string;
  filerStatus: string;
  netDividend: number;
  grossDividend: number;
  taxDeducted: number;
  zakatDeducted: number;
  uploadedBy?: string; // User email
  uploadedAt: Date;
  updatedAt?: Date;
}

const DB_NAME = process.env.MONGODB_DB || 'portfolioTrack';
const COLLECTION_NAME = 'paymentDividends';

async function getCollection(): Promise<Collection<PaymentDividend>> {
  const client = await clientPromise;
  const db: Db = client.db(DB_NAME);
  return db.collection<PaymentDividend>(COLLECTION_NAME);
}

/**
 * Initialize indexes
 */
export async function initializePaymentDividendIndexes() {
  const collection = await getCollection();

  await collection.createIndex({ symbol: 1, paymentDate: -1 });
  await collection.createIndex({ warrantNo: 1 }, { unique: true });
  await collection.createIndex({ uploadedBy: 1 });
  await collection.createIndex({ paymentDate: 1 });
}

/**
 * Check if payment dividend already exists
 */
export async function checkDuplicatePaymentDividend(
  symbol: string,
  paymentDate: Date,
  warrantNo: string
): Promise<boolean> {
  const collection = await getCollection();

  const existing = await collection.findOne({
    symbol: symbol.toUpperCase(),
    paymentDate,
    warrantNo
  });

  return !!existing;
}

/**
 * Create payment dividends in bulk
 */
export async function createPaymentDividendsBulk(
  uploadedBy: string,
  dividends: Omit<PaymentDividend, '_id' | 'uploadedAt' | 'uploadedBy'>[]
) {
  const collection = await getCollection();
  const now = new Date();

  const documents = dividends.map(dividend => ({
    ...dividend,
    uploadedBy,
    uploadedAt: now,
    updatedAt: now
  }));

  console.log(`[DB] Inserting ${documents.length} payment dividends`);
  const result = await collection.insertMany(documents);
  console.log(`[DB] Inserted ${result.insertedCount} documents`);
  return result;
}

/**
 * Get payment dividends with filters
 */
export async function getPaymentDividends(filter: {
  symbol?: string | string[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const collection = await getCollection();

  const query: import('mongodb').Filter<PaymentDividend> = {};

  if (filter.symbol) {
    if (Array.isArray(filter.symbol)) {
      query.symbol = { $in: filter.symbol.map(s => s.toUpperCase()) };
    } else {
      query.symbol = filter.symbol.toUpperCase();
    }
  }

  if (filter.startDate || filter.endDate) {
    query.paymentDate = {};
    if (filter.startDate) {
      query.paymentDate.$gte = filter.startDate;
    }
    if (filter.endDate) {
      query.paymentDate.$lte = filter.endDate;
    }
  }

  const page = filter.page || 1;
  const limit = filter.limit || 50;
  const skip = (page - 1) * limit;

  console.log(`[DB] Querying payment dividends:`, JSON.stringify(query));

  const [data, total] = await Promise.all([
    collection
      .find(query)
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query)
  ]);

  return { data, total, page, limit };
}

/**
 * Get payment dividend statistics by symbol
 */
export async function getPaymentDividendStats(symbol: string) {
  const collection = await getCollection();

  const stats = await collection.aggregate([
    { $match: { symbol: symbol.toUpperCase() } },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalNetDividend: { $sum: '$netDividend' },
        totalGrossDividend: { $sum: '$grossDividend' },
        totalTaxDeducted: { $sum: '$taxDeducted' },
        totalZakatDeducted: { $sum: '$zakatDeducted' },
        latestPayment: { $max: '$paymentDate' },
        earliestPayment: { $min: '$paymentDate' }
      }
    }
  ]).toArray();

  return stats[0] || null;
}

/**
 * Update payment dividend
 */
export async function updatePaymentDividend(
  id: string,
  updates: Partial<Omit<PaymentDividend, '_id' | 'uploadedAt' | 'uploadedBy'>>
) {
  const collection = await getCollection();

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updates,
        updatedAt: new Date()
      }
    }
  );

  return result;
}

/**
 * Delete payment dividend
 */
export async function deletePaymentDividend(id: string) {
  const collection = await getCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result;
}

/**
 * Get payment dividend by ID
 */
export async function getPaymentDividendById(id: string) {
  const collection = await getCollection();
  const dividend = await collection.findOne({ _id: new ObjectId(id) });
  return dividend;
}
