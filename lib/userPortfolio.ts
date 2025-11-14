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
  await collection.createIndex({ userId: 1, symbol: 1 }, { unique: true });
  await collection.createIndex({ userId: 1 });
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

  const updateFields: any = {
    userId,
    symbol: input.symbol.toUpperCase(),
    shares: input.shares,
    avgBuy: input.avgBuy,
    updatedAt: now,
  };

  // Only set purchaseDate if provided
  if (input.purchaseDate) {
    updateFields.purchaseDate = new Date(input.purchaseDate);
  }

  await collection.updateOne(
    { userId, symbol: input.symbol.toUpperCase() },
    {
      $set: updateFields,
      $setOnInsert: {
        createdAt: now,
        // If purchaseDate not provided and this is a new document, use createdAt
        ...(input.purchaseDate ? {} : { purchaseDate: now }),
      },
    },
    { upsert: true }
  );
}

export async function deletePortfolioStock(userId: string, symbol: string): Promise<void> {
  const collection = await getPortfolioCollection();
  await collection.deleteOne({ userId, symbol: symbol.toUpperCase() });
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

