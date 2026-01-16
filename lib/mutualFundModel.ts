import { ObjectId, Db, Collection, Filter } from 'mongodb';
import clientPromise from './mongodb';

/**
 * Mutual Fund Model
 * Tracks mutual fund holdings, transactions, and NAV history
 */

export type MutualFundTransactionType = 'BUY' | 'SELL' | 'REDEMPTION' | 'DIVIDEND_REINVEST';
export type MutualFundStatus = 'active' | 'deleted';

// Mutual Fund Metadata
export interface MutualFundDocument {
  _id?: ObjectId;
  fundCode: string; // Unique fund identifier
  fundName: string;
  amc?: string; // Asset Management Company
  category?: string; // Equity, Debt, Balanced, etc.
  sector?: string; // Open-End Funds, etc.
  rating?: string; // AA+(f), AAA(f), etc.
  benchmark?: string; // Benchmark index
  currentNAV?: number;
  lastNAVUpdate?: Date;
  // Performance metrics (returns in percentage)
  ytdReturn?: number; // Year to Date return %
  mtdReturn?: number; // Month to Date return %
  return1Day?: number; // 1 Day return %
  return15Days?: number; // 15 Days return %
  return30Days?: number; // 30 Days return %
  return90Days?: number; // 90 Days return %
  return180Days?: number; // 180 Days return %
  return270Days?: number; // 270 Days return %
  return365Days?: number; // 365 Days return %
  return2Years?: number; // 2 Years return %
  return3Years?: number; // 3 Years return %
  createdAt: Date;
  updatedAt: Date;
}

// Mutual Fund Transaction
export interface MutualFundTransactionDocument {
  _id?: ObjectId;
  userId: string; // User email
  fundCode: string;
  transactionType: MutualFundTransactionType;
  units: number;
  nav: number; // NAV at time of transaction
  amount: number; // units * nav
  transactionDate: Date;
  notes?: string;
  createdAt: Date;
  lastModified: Date;
  status: MutualFundStatus;
}

// Mutual Fund Holding (aggregated view)
export interface MutualFundHoldingDocument {
  _id?: ObjectId;
  userId: string; // User email
  fundCode: string;
  fundName?: string; // Denormalized for quick access
  totalUnits: number;
  averageNAV: number; // Weighted average NAV
  currentNAV?: number; // Latest NAV from mutual_funds collection
  totalInvested: number; // Total amount invested
  currentValue?: number; // totalUnits * currentNAV
  firstPurchaseDate?: Date;
  lastTransactionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// NAV History (time series)
export interface MutualFundNAVHistoryDocument {
  _id?: ObjectId;
  fundCode: string;
  nav: number;
  date: Date; // Date for which this NAV is valid
  source?: 'api' | 'manual' | 'upload'; // How NAV was obtained
  createdAt: Date;
}

// Input types
export interface MutualFundInput {
  fundCode: string;
  fundName: string;
  amc?: string;
  category?: string;
  sector?: string;
  rating?: string;
  benchmark?: string;
  // Performance metrics (returns in percentage)
  ytdReturn?: number;
  mtdReturn?: number;
  return1Day?: number;
  return15Days?: number;
  return30Days?: number;
  return90Days?: number;
  return180Days?: number;
  return270Days?: number;
  return365Days?: number;
  return2Years?: number;
  return3Years?: number;
}

export interface MutualFundTransactionInput {
  fundCode: string;
  transactionType: MutualFundTransactionType;
  units: number;
  nav: number;
  transactionDate: Date;
  notes?: string;
}

export interface MutualFundHoldingInput {
  fundCode: string;
  fundName?: string;
  totalUnits: number;
  averageNAV: number;
  firstPurchaseDate?: Date;
}

export interface MutualFundNAVInput {
  fundCode: string;
  nav: number;
  date: Date;
  source?: 'api' | 'manual' | 'upload';
}

export interface MutualFundTransactionFilter {
  userId?: string;
  fundCode?: string;
  transactionType?: MutualFundTransactionType;
  startDate?: Date;
  endDate?: Date;
  status?: MutualFundStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Collections
const MUTUAL_FUNDS_COLLECTION = 'mutual_funds';
const MUTUAL_FUND_TRANSACTIONS_COLLECTION = 'mutual_fund_transactions';
const MUTUAL_FUND_HOLDINGS_COLLECTION = 'mutual_fund_holdings';
const MUTUAL_FUND_NAV_HISTORY_COLLECTION = 'mutual_fund_nav_history';

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
}

async function getMutualFundsCollection(): Promise<Collection<MutualFundDocument>> {
  const db = await getDb();
  const collection = db.collection<MutualFundDocument>(MUTUAL_FUNDS_COLLECTION);
  await collection.createIndex({ fundCode: 1 }, { unique: true });
  return collection;
}

async function getMutualFundTransactionsCollection(): Promise<Collection<MutualFundTransactionDocument>> {
  const db = await getDb();
  const collection = db.collection<MutualFundTransactionDocument>(MUTUAL_FUND_TRANSACTIONS_COLLECTION);
  await collection.createIndex({ userId: 1, transactionDate: -1 });
  await collection.createIndex({ userId: 1, fundCode: 1, transactionDate: 1 });
  await collection.createIndex({ userId: 1, transactionType: 1 });
  await collection.createIndex({ status: 1 });
  return collection;
}

async function getMutualFundHoldingsCollection(): Promise<Collection<MutualFundHoldingDocument>> {
  const db = await getDb();
  const collection = db.collection<MutualFundHoldingDocument>(MUTUAL_FUND_HOLDINGS_COLLECTION);
  await collection.createIndex({ userId: 1, fundCode: 1 }, { unique: true });
  await collection.createIndex({ userId: 1 });
  return collection;
}

async function getMutualFundNAVHistoryCollection(): Promise<Collection<MutualFundNAVHistoryDocument>> {
  const db = await getDb();
  const collection = db.collection<MutualFundNAVHistoryDocument>(MUTUAL_FUND_NAV_HISTORY_COLLECTION);
  await collection.createIndex({ fundCode: 1, date: -1 });
  await collection.createIndex({ fundCode: 1 });
  await collection.createIndex({ date: -1 });
  return collection;
}

// ============================================================================
// Mutual Fund Metadata Operations
// ============================================================================

export async function createOrUpdateMutualFund(input: MutualFundInput): Promise<MutualFundDocument> {
  const collection = await getMutualFundsCollection();
  const now = new Date();

  const updateFields: Partial<MutualFundDocument> = {
    fundCode: input.fundCode.toUpperCase(),
    fundName: input.fundName,
    updatedAt: now,
  };

  if (input.amc !== undefined) updateFields.amc = input.amc;
  if (input.category !== undefined) updateFields.category = input.category;
  if (input.sector !== undefined) updateFields.sector = input.sector;
  if (input.rating !== undefined) updateFields.rating = input.rating;
  if (input.benchmark !== undefined) updateFields.benchmark = input.benchmark;
  if (input.ytdReturn !== undefined) updateFields.ytdReturn = input.ytdReturn;
  if (input.mtdReturn !== undefined) updateFields.mtdReturn = input.mtdReturn;
  if (input.return1Day !== undefined) updateFields.return1Day = input.return1Day;
  if (input.return15Days !== undefined) updateFields.return15Days = input.return15Days;
  if (input.return30Days !== undefined) updateFields.return30Days = input.return30Days;
  if (input.return90Days !== undefined) updateFields.return90Days = input.return90Days;
  if (input.return180Days !== undefined) updateFields.return180Days = input.return180Days;
  if (input.return270Days !== undefined) updateFields.return270Days = input.return270Days;
  if (input.return365Days !== undefined) updateFields.return365Days = input.return365Days;
  if (input.return2Years !== undefined) updateFields.return2Years = input.return2Years;
  if (input.return3Years !== undefined) updateFields.return3Years = input.return3Years;

  const result = await collection.findOneAndUpdate(
    { fundCode: input.fundCode.toUpperCase() },
    {
      $set: updateFields,
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  return result!;
}

export async function getMutualFund(fundCode: string): Promise<MutualFundDocument | null> {
  const collection = await getMutualFundsCollection();
  return collection.findOne({ fundCode: fundCode.toUpperCase() });
}

export async function getAllMutualFunds(): Promise<MutualFundDocument[]> {
  const collection = await getMutualFundsCollection();
  return collection.find({}).sort({ fundName: 1 }).toArray();
}

export async function updateMutualFundNAV(fundCode: string, nav: number): Promise<void> {
  const collection = await getMutualFundsCollection();
  await collection.updateOne(
    { fundCode: fundCode.toUpperCase() },
    {
      $set: {
        currentNAV: nav,
        lastNAVUpdate: new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

// ============================================================================
// Transaction Operations
// ============================================================================

export async function createMutualFundTransaction(
  userId: string,
  input: MutualFundTransactionInput
): Promise<MutualFundTransactionDocument> {
  const collection = await getMutualFundTransactionsCollection();
  const now = new Date();
  const amount = input.units * input.nav;

  const transaction: MutualFundTransactionDocument = {
    userId,
    fundCode: input.fundCode.toUpperCase(),
    transactionType: input.transactionType,
    units: input.units,
    nav: input.nav,
    amount,
    transactionDate: input.transactionDate,
    notes: input.notes,
    createdAt: now,
    lastModified: now,
    status: 'active',
  };

  const result = await collection.insertOne(transaction);
  return { ...transaction, _id: result.insertedId };
}

export async function createMutualFundTransactionsBulk(
  userId: string,
  inputs: MutualFundTransactionInput[]
): Promise<{ insertedCount: number; insertedIds: ObjectId[] }> {
  const collection = await getMutualFundTransactionsCollection();
  const now = new Date();

  const transactions: MutualFundTransactionDocument[] = inputs.map(input => ({
    userId,
    fundCode: input.fundCode.toUpperCase(),
    transactionType: input.transactionType,
    units: input.units,
    nav: input.nav,
    amount: input.units * input.nav,
    transactionDate: input.transactionDate,
    notes: input.notes,
    createdAt: now,
    lastModified: now,
    status: 'active',
  }));

  const result = await collection.insertMany(transactions);
  return {
    insertedCount: result.insertedCount,
    insertedIds: Object.values(result.insertedIds),
  };
}

export async function getMutualFundTransactions(
  filter: MutualFundTransactionFilter
): Promise<{ transactions: MutualFundTransactionDocument[]; total: number }> {
  const collection = await getMutualFundTransactionsCollection();

  const query: Filter<MutualFundTransactionDocument> = {};

  if (filter.userId) query.userId = filter.userId;
  if (filter.fundCode) query.fundCode = filter.fundCode.toUpperCase();
  if (filter.transactionType) query.transactionType = filter.transactionType;
  if (filter.status) query.status = filter.status;
  else query.status = 'active';

  if (filter.startDate || filter.endDate) {
    query.transactionDate = {};
    if (filter.startDate) query.transactionDate.$gte = filter.startDate;
    if (filter.endDate) query.transactionDate.$lte = filter.endDate;
  }

  const page = filter.page || 1;
  const limit = filter.limit || 50;
  const skip = (page - 1) * limit;

  const sortField = filter.sortBy || 'transactionDate';
  const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;
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

export async function deleteMutualFundTransaction(
  userId: string,
  transactionId: string
): Promise<boolean> {
  const collection = await getMutualFundTransactionsCollection();

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

// ============================================================================
// Holdings Operations
// ============================================================================

export async function getUserMutualFundHoldings(userId: string): Promise<MutualFundHoldingDocument[]> {
  const collection = await getMutualFundHoldingsCollection();
  return collection.find({ userId }).sort({ fundCode: 1 }).toArray();
}

export async function saveMutualFundHolding(
  userId: string,
  input: MutualFundHoldingInput
): Promise<void> {
  const collection = await getMutualFundHoldingsCollection();
  const now = new Date();

  // Get fund name if not provided
  let fundName = input.fundName;
  if (!fundName) {
    const fund = await getMutualFund(input.fundCode);
    fundName = fund?.fundName;
  }

  const document: MutualFundHoldingDocument = {
    userId,
    fundCode: input.fundCode.toUpperCase(),
    fundName,
    totalUnits: input.totalUnits,
    averageNAV: input.averageNAV,
    totalInvested: input.totalUnits * input.averageNAV,
    firstPurchaseDate: input.firstPurchaseDate ? new Date(input.firstPurchaseDate) : now,
    createdAt: now,
    updatedAt: now,
  };

  await collection.updateOne(
    { userId, fundCode: input.fundCode.toUpperCase() },
    { $set: document },
    { upsert: true }
  );
}

export async function deleteMutualFundHolding(
  userId: string,
  fundCode: string
): Promise<void> {
  const collection = await getMutualFundHoldingsCollection();
  await collection.deleteOne({ userId, fundCode: fundCode.toUpperCase() });
}

export async function syncHoldingsFromTransactions(userId: string): Promise<void> {
  // Get all active transactions for user
  const { transactions } = await getMutualFundTransactions({
    userId,
    status: 'active',
    limit: 10000,
  });

  // Group by fundCode
  const transactionsByFund = new Map<string, MutualFundTransactionDocument[]>();
  for (const tx of transactions) {
    const existing = transactionsByFund.get(tx.fundCode) || [];
    existing.push(tx);
    transactionsByFund.set(tx.fundCode, existing);
  }

  // Calculate holdings for each fund
  for (const [fundCode, fundTransactions] of transactionsByFund.entries()) {
    let totalUnits = 0;
    let totalInvested = 0;
    let firstPurchaseDate: Date | undefined;
    let lastTransactionDate: Date | undefined;

    // Sort by date
    fundTransactions.sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());

    for (const tx of fundTransactions) {
      if (tx.transactionType === 'BUY' || tx.transactionType === 'DIVIDEND_REINVEST') {
        totalUnits += tx.units;
        totalInvested += tx.amount;
        if (!firstPurchaseDate) firstPurchaseDate = tx.transactionDate;
      } else if (tx.transactionType === 'SELL' || tx.transactionType === 'REDEMPTION') {
        totalUnits -= tx.units;
        totalInvested -= tx.amount; // Simplified - in reality should use FIFO
      }
      if (!lastTransactionDate || tx.transactionDate > lastTransactionDate) {
        lastTransactionDate = tx.transactionDate;
      }
    }

    if (totalUnits > 0) {
      const averageNAV = totalInvested / totalUnits;
      await saveMutualFundHolding(userId, {
        fundCode,
        totalUnits,
        averageNAV,
        firstPurchaseDate,
      });
    } else {
      // Delete holding if no units left
      await deleteMutualFundHolding(userId, fundCode);
    }
  }
}

// ============================================================================
// NAV History Operations
// ============================================================================

export async function saveMutualFundNAV(input: MutualFundNAVInput): Promise<void> {
  const collection = await getMutualFundNAVHistoryCollection();
  const now = new Date();

  // Check if NAV for this date already exists
  const existing = await collection.findOne({
    fundCode: input.fundCode.toUpperCase(),
    date: input.date,
  });

  if (existing) {
    // Update existing
    await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          nav: input.nav,
          source: input.source || 'manual',
        },
      }
    );
  } else {
    // Insert new
    await collection.insertOne({
      fundCode: input.fundCode.toUpperCase(),
      nav: input.nav,
      date: input.date,
      source: input.source || 'manual',
      createdAt: now,
    });
  }

  // Update current NAV in mutual_funds collection
  await updateMutualFundNAV(input.fundCode, input.nav);
}

export async function getMutualFundNAVHistory(
  fundCode: string,
  from?: Date,
  to?: Date,
  limit?: number
): Promise<MutualFundNAVHistoryDocument[]> {
  const collection = await getMutualFundNAVHistoryCollection();

  const query: Filter<MutualFundNAVHistoryDocument> = {
    fundCode: fundCode.toUpperCase(),
  };

  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  return collection
    .find(query)
    .sort({ date: -1 })
    .limit(limit || 1000)
    .toArray();
}

export async function getLatestNAV(fundCode: string): Promise<number | null> {
  const fund = await getMutualFund(fundCode);
  return fund?.currentNAV || null;
}


