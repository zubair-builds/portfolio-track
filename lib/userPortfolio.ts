import type { Collection, Db, ObjectId } from 'mongodb';
import clientPromise from './mongodb';

// Portfolio Document
export interface PortfolioDocument {
  _id?: ObjectId;
  userId: string; // User email
  symbol: string;
  shares: number;
  avgBuy: number;
  purchaseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioInput {
  symbol: string;
  shares: number;
  avgBuy: number;
  purchaseDate?: Date;
}

// Watchlist Document
export interface WatchlistDocument {
  _id?: ObjectId;
  userId: string; // User email
  symbol: string;
  thesis?: string;
  targetPrice?: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistInput {
  symbol: string;
  thesis?: string;
  targetPrice?: number;
  note?: string;
}

const PORTFOLIO_COLLECTION = 'portfolios';
const WATCHLIST_COLLECTION = 'watchlists';

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
}

async function getPortfolioCollection(): Promise<Collection<PortfolioDocument>> {
  const db = await getDb();
  const collection = db.collection<PortfolioDocument>(PORTFOLIO_COLLECTION);

  // Removed unique constraint on {userId, symbol} to allow multiple positions per symbol
  // First, try to drop the existing unique index if it exists
  try {
    await collection.dropIndex('userId_1_symbol_1');
    console.log('Dropped existing unique index on {userId, symbol}');
  } catch (error: any) {
    // Index doesn't exist or already dropped, ignore
    if (error.code !== 27 && error.codeName !== 'IndexNotFound') {
      console.warn('Error dropping index (may not exist):', error.message);
    }
  }

  // Create non-unique indexes
  try {
    await collection.createIndex({ userId: 1 });
  } catch (error: any) {
    // Index may already exist, ignore
    if (error.code !== 85 && error.codeName !== 'IndexOptionsConflict') {
      console.warn('Error creating userId index:', error.message);
    }
  }

  try {
    await collection.createIndex({ userId: 1, symbol: 1 }, { unique: false }); // Explicitly non-unique
  } catch (error: any) {
    // Index may already exist, ignore
    if (error.code !== 85 && error.codeName !== 'IndexOptionsConflict') {
      console.warn('Error creating userId+symbol index:', error.message);
    }
  }

  return collection;
}

async function getWatchlistCollection(): Promise<Collection<WatchlistDocument>> {
  const db = await getDb();
  const collection = db.collection<WatchlistDocument>(WATCHLIST_COLLECTION);
  await collection.createIndex({ userId: 1, symbol: 1 }, { unique: true });
  await collection.createIndex({ userId: 1 });
  return collection;
}

// Portfolio Functions
export async function getUserPortfolio(userId: string): Promise<PortfolioDocument[]> {
  const collection = await getPortfolioCollection();
  return collection.find({ userId }).sort({ symbol: 1 }).toArray();
}

export async function savePortfolioStock(userId: string, input: PortfolioInput): Promise<void> {
  const collection = await getPortfolioCollection();
  const now = new Date();

  const document: PortfolioDocument = {
    userId,
    symbol: input.symbol.toUpperCase(),
    shares: input.shares,
    avgBuy: input.avgBuy,
    purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : now,
    createdAt: now,
    updatedAt: now,
  };

  // Always insert a new position (no upsert)
  await collection.insertOne(document);
}

export async function deletePortfolioStock(userId: string, positionId: string): Promise<void> {
  const collection = await getPortfolioCollection();
  const { ObjectId } = await import('mongodb');
  await collection.deleteOne({
    userId,
    _id: new ObjectId(positionId)
  });
}

export async function deletePortfolioStockBySymbol(userId: string, symbol: string): Promise<number> {
  const collection = await getPortfolioCollection();
  const result = await collection.deleteMany({ userId, symbol: symbol.toUpperCase() });
  return result.deletedCount;
}

export async function updatePortfolioStock(userId: string, positionId: string, input: PortfolioInput): Promise<void> {
  const collection = await getPortfolioCollection();
  const { ObjectId } = await import('mongodb');
  const now = new Date();

  const updateFields: any = {
    symbol: input.symbol.toUpperCase(),
    shares: input.shares,
    avgBuy: input.avgBuy,
    updatedAt: now,
  };

  if (input.purchaseDate) {
    updateFields.purchaseDate = new Date(input.purchaseDate);
  }

  await collection.updateOne(
    { userId, _id: new ObjectId(positionId) },
    { $set: updateFields }
  );
}

export async function updatePortfolioStockBySymbol(userId: string, symbol: string, input: PortfolioInput): Promise<void> {
  const collection = await getPortfolioCollection();

  // Delete all existing positions for this symbol to avoid duplicates
  await collection.deleteMany({ userId, symbol: symbol.toUpperCase() });

  // Insert new consolidated position
  await savePortfolioStock(userId, input);
}

export async function initializeUserPortfolio(userId: string, stocks: PortfolioInput[]): Promise<void> {
  const collection = await getPortfolioCollection();

  // Check if user already has portfolio
  const existing = await collection.findOne({ userId });
  if (existing) {
    return; // Don't overwrite existing portfolio
  }

  const now = new Date();
  const documents: PortfolioDocument[] = stocks.map((stock) => ({
    userId,
    symbol: stock.symbol.toUpperCase(),
    shares: stock.shares,
    avgBuy: stock.avgBuy,
    purchaseDate: stock.purchaseDate ? new Date(stock.purchaseDate) : now,
    createdAt: now,
    updatedAt: now,
  }));

  if (documents.length > 0) {
    await collection.insertMany(documents);
  }
}

// Watchlist Functions
export async function getUserWatchlist(userId: string): Promise<WatchlistDocument[]> {
  const collection = await getWatchlistCollection();
  return collection.find({ userId }).sort({ symbol: 1 }).toArray();
}

export async function saveWatchlistItem(userId: string, input: WatchlistInput): Promise<void> {
  const collection = await getWatchlistCollection();
  const now = new Date();

  await collection.updateOne(
    { userId, symbol: input.symbol.toUpperCase() },
    {
      $set: {
        userId,
        symbol: input.symbol.toUpperCase(),
        thesis: input.thesis,
        targetPrice: input.targetPrice,
        note: input.note,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

export async function deleteWatchlistItem(userId: string, symbol: string): Promise<void> {
  const collection = await getWatchlistCollection();
  await collection.deleteOne({ userId, symbol: symbol.toUpperCase() });
}

export async function initializeUserWatchlist(userId: string, items: WatchlistInput[]): Promise<void> {
  const collection = await getWatchlistCollection();

  // Check if user already has watchlist
  const existing = await collection.findOne({ userId });
  if (existing) {
    return; // Don't overwrite existing watchlist
  }

  const now = new Date();
  const documents: WatchlistDocument[] = items.map((item) => ({
    userId,
    symbol: item.symbol.toUpperCase(),
    thesis: item.thesis,
    targetPrice: item.targetPrice,
    note: item.note,
    createdAt: now,
    updatedAt: now,
  }));

  if (documents.length > 0) {
    await collection.insertMany(documents);
  }
}

