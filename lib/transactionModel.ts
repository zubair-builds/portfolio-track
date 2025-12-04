import { ObjectId, Db, Collection, Filter } from 'mongodb';
import clientPromise from './mongodb';

/**
 * Transaction Model for Buy/Sell stock operations
 * Tracks individual transactions with FIFO cost basis calculation
 */

export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND';
export type TransactionStatus = 'active' | 'deleted';

export interface TransactionDocument {
  _id?: ObjectId;
  userId: string; // User email
  symbol: string;
  transactionType: TransactionType;
  shares: number;
  pricePerShare: number;
  totalAmount: number; // shares * pricePerShare (or dividend amount for DIVIDEND type)
  transactionDate: Date;
  notes?: string;

  // Metadata
  createdAt: Date;
  lastModified: Date;
  status: TransactionStatus;

  // For SELL transactions - FIFO calculation results
  realizedGain?: number;
  cgtAmount?: number; // Capital Gains Tax (15%)
  holdingPeriodDays?: number; // Average holding period
  lotsUsed?: FIFOLot[]; // Which buy lots were used

  // For DIVIDEND transactions
  dividendPerShare?: number; // Dividend amount per share
  grossDividend?: number; // Before tax
  taxDeducted?: number; // WHT deducted
  zakatDeducted?: number; // Zakat deducted
  netDividend?: number; // After deductions
}

export interface FIFOLot {
  buyTransactionId: string; // Reference to BUY transaction
  shares: number; // Shares taken from this lot
  buyPrice: number;
  buyDate: Date;
  holdingDays: number;
  gain: number; // (sellPrice - buyPrice) * shares
  cgtAmount: number; // 15% of gain
}

export interface TransactionInput {
  symbol: string;
  transactionType: TransactionType;
  shares: number;
  pricePerShare: number;
  transactionDate: Date;
  notes?: string;
}

export interface TransactionFilter {
  userId?: string;
  symbol?: string;
  transactionType?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  status?: TransactionStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const TRANSACTIONS_COLLECTION = 'transactions';

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
}

async function getTransactionsCollection(): Promise<Collection<TransactionDocument>> {
  const db = await getDb();
  const collection = db.collection<TransactionDocument>(TRANSACTIONS_COLLECTION);

  // Create indexes for efficient querying
  await collection.createIndex({ userId: 1, transactionDate: -1 });
  await collection.createIndex({ userId: 1, symbol: 1, transactionDate: 1 });
  await collection.createIndex({ userId: 1, transactionType: 1 });
  await collection.createIndex({ status: 1 });

  return collection;
}

/**
 * Create a new transaction
 */
export async function createTransaction(
  userId: string,
  input: TransactionInput
): Promise<TransactionDocument> {
  const collection = await getTransactionsCollection();

  const now = new Date();
  const totalAmount = input.shares * input.pricePerShare;

  const transaction: TransactionDocument = {
    userId,
    symbol: input.symbol.toUpperCase(),
    transactionType: input.transactionType,
    shares: input.shares,
    pricePerShare: input.pricePerShare,
    totalAmount,
    transactionDate: input.transactionDate,
    notes: input.notes,
    createdAt: now,
    lastModified: now,
    status: 'active',
  };

  const result = await collection.insertOne(transaction);
  return { ...transaction, _id: result.insertedId };
}

/**
 * Create multiple transactions (bulk upload)
 */
export async function createTransactionsBulk(
  userId: string,
  inputs: TransactionInput[]
): Promise<{ insertedCount: number; insertedIds: ObjectId[] }> {
  const collection = await getTransactionsCollection();
  const now = new Date();

  const transactions: TransactionDocument[] = inputs.map(input => ({
    userId,
    symbol: input.symbol.toUpperCase(),
    transactionType: input.transactionType,
    shares: input.shares,
    pricePerShare: input.pricePerShare,
    totalAmount: input.shares * input.pricePerShare,
    transactionDate: input.transactionDate,
    notes: input.notes,
    createdAt: now,
    lastModified: now,
    status: 'active',
    // Initialize FIFO fields for SELL transactions as undefined/empty
    ...(input.transactionType === 'SELL' ? {
      realizedGain: 0,
      cgtAmount: 0,
      holdingPeriodDays: 0,
      lotsUsed: []
    } : {})
  }));

  const result = await collection.insertMany(transactions);
  return {
    insertedCount: result.insertedCount,
    insertedIds: Object.values(result.insertedIds),
  };
}

/**
 * Get transactions with filtering and pagination
 */
export async function getTransactions(
  filter: TransactionFilter
): Promise<{ transactions: TransactionDocument[]; total: number }> {
  const collection = await getTransactionsCollection();

  const query: Filter<TransactionDocument> = {};

  if (filter.userId) query.userId = filter.userId;
  if (filter.symbol) query.symbol = filter.symbol.toUpperCase();
  if (filter.transactionType) query.transactionType = filter.transactionType;
  if (filter.status) query.status = filter.status;
  else query.status = 'active'; // Default to active only

  // Date range filter
  if (filter.startDate || filter.endDate) {
    query.transactionDate = {};
    if (filter.startDate) query.transactionDate.$gte = filter.startDate;
    if (filter.endDate) query.transactionDate.$lte = filter.endDate;
  }

  const page = filter.page || 1;
  const limit = filter.limit || 50;
  const skip = (page - 1) * limit;

  // Determine sort
  const sortField = filter.sortBy || 'transactionDate';
  const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;

  // Always include secondary sort for stability
  const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };
  if (sortField !== 'createdAt') {
    sort.createdAt = -1;
  }

  const [transactions, total] = await Promise.all([
    collection
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return { transactions, total };
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(
  userId: string,
  transactionId: string
): Promise<TransactionDocument | null> {
  const collection = await getTransactionsCollection();

  return await collection.findOne({
    _id: new ObjectId(transactionId),
    userId,
    status: 'active',
  });
}

/**
 * Update transaction
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  updates: Partial<TransactionInput>
): Promise<TransactionDocument | null> {
  const collection = await getTransactionsCollection();

  const updateDoc: Partial<TransactionDocument> = {
    lastModified: new Date(),
  };

  if (updates.shares !== undefined) {
    updateDoc.shares = updates.shares;
    // Recalculate total if shares or price changes
    const current = await getTransactionById(userId, transactionId);
    if (current) {
      const newPrice = updates.pricePerShare ?? current.pricePerShare;
      updateDoc.totalAmount = updates.shares * newPrice;
    }
  }

  if (updates.pricePerShare !== undefined) {
    updateDoc.pricePerShare = updates.pricePerShare;
    const current = await getTransactionById(userId, transactionId);
    if (current) {
      const newShares = updates.shares ?? current.shares;
      updateDoc.totalAmount = newShares * updates.pricePerShare;
    }
  }

  if (updates.transactionDate !== undefined) updateDoc.transactionDate = updates.transactionDate;
  if (updates.notes !== undefined) updateDoc.notes = updates.notes;

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(transactionId), userId, status: 'active' },
    { $set: updateDoc },
    { returnDocument: 'after' }
  );

  return result;
}

/**
 * Soft delete transaction
 */
export async function deleteTransaction(
  userId: string,
  transactionId: string
): Promise<boolean> {
  const collection = await getTransactionsCollection();

  const result = await collection.updateOne(
    { _id: new ObjectId(transactionId), userId, status: 'active' },
    {
      $set: {
        status: 'deleted',
        lastModified: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Get all BUY transactions for a symbol (for FIFO calculation)
 */
export async function getBuyTransactionsForSymbol(
  userId: string,
  symbol: string
): Promise<TransactionDocument[]> {
  const collection = await getTransactionsCollection();

  return await collection
    .find({
      userId,
      symbol: symbol.toUpperCase(),
      transactionType: 'BUY',
      status: 'active',
    })
    .sort({ transactionDate: 1, createdAt: 1 }) // Oldest first for FIFO
    .toArray();
}

/**
 * Update SELL transaction with FIFO calculation results
 */
export async function updateSellTransactionWithFIFO(
  transactionId: string,
  fifoResults: {
    realizedGain: number;
    cgtAmount: number;
    holdingPeriodDays: number;
    lotsUsed: FIFOLot[];
  }
): Promise<void> {
  const collection = await getTransactionsCollection();

  await collection.updateOne(
    { _id: new ObjectId(transactionId) },
    {
      $set: {
        realizedGain: fifoResults.realizedGain,
        cgtAmount: fifoResults.cgtAmount,
        holdingPeriodDays: fifoResults.holdingPeriodDays,
        lotsUsed: fifoResults.lotsUsed,
        lastModified: new Date(),
      },
    }
  );
}

/**
 * Get transaction statistics for a user
 */
export async function getTransactionStats(userId: string): Promise<{
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;
  totalRealizedGains: number;
  totalCGTPaid: number;
}> {
  const collection = await getTransactionsCollection();

  const [allTransactions, buyCount, sellCount] = await Promise.all([
    collection.find({ userId, status: 'active' }).toArray(),
    collection.countDocuments({ userId, transactionType: 'BUY', status: 'active' }),
    collection.countDocuments({ userId, transactionType: 'SELL', status: 'active' }),
  ]);

  const totalRealizedGains = allTransactions
    .filter(t => t.transactionType === 'SELL' && t.realizedGain !== undefined)
    .reduce((sum, t) => sum + (t.realizedGain || 0), 0);

  const totalCGTPaid = allTransactions
    .filter(t => t.transactionType === 'SELL' && t.cgtAmount !== undefined)
    .reduce((sum, t) => sum + (t.cgtAmount || 0), 0);

  return {
    totalTransactions: allTransactions.length,
    totalBuys: buyCount,
    totalSells: sellCount,
    totalRealizedGains,
    totalCGTPaid,
  };
}

/**
 * Get all transactions for specific symbols (for bulk FIFO recalc)
 */
export async function getTransactionsForSymbols(
  userId: string,
  symbols: string[]
): Promise<TransactionDocument[]> {
  const collection = await getTransactionsCollection();

  return await collection
    .find({
      userId,
      symbol: { $in: symbols.map(s => s.toUpperCase()) },
      status: 'active',
    })
    .sort({ transactionDate: 1, createdAt: 1 })
    .toArray();
}

/**
 * Bulk update transactions with FIFO results
 */
export async function bulkUpdateFIFO(
  updates: {
    transactionId: string;
    fifoResult: {
      realizedGain: number;
      cgtAmount: number;
      holdingPeriodDays: number;
      lotsUsed: FIFOLot[];
    };
  }[]
): Promise<void> {
  if (updates.length === 0) return;

  const collection = await getTransactionsCollection();

  const bulkOps = updates.map(update => ({
    updateOne: {
      filter: { _id: new ObjectId(update.transactionId) },
      update: {
        $set: {
          realizedGain: update.fifoResult.realizedGain,
          cgtAmount: update.fifoResult.cgtAmount,
          holdingPeriodDays: update.fifoResult.holdingPeriodDays,
          lotsUsed: update.fifoResult.lotsUsed,
          lastModified: new Date(),
        },
      },
    },
  }));

  await collection.bulkWrite(bulkOps);
}

