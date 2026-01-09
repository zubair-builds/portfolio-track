import { Collection, Db } from 'mongodb';
import clientPromise from './mongodb';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface InternationalTicker {
    symbol: string;
    name: string;
    exchange: string;
    currency?: string;
    addedAt: Date;
    includeInStrategy?: boolean;
}

interface InternationalTickerDocument extends InternationalTicker {
    _id?: string;
}

// ============================================================================
// Database Access
// ============================================================================

async function getDb(): Promise<Db> {
    const client = await clientPromise;
    return client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
}

const COLLECTION_NAME = 'international_tickers';

async function getCollection(): Promise<Collection<InternationalTickerDocument>> {
    const db = await getDb();
    const collection = db.collection<InternationalTickerDocument>(COLLECTION_NAME);
    await collection.createIndex({ symbol: 1 }, { unique: true });
    return collection;
}

// ============================================================================
// Watchlist Operations
// ============================================================================

/**
 * Get all tickers in the watchlist
 */
export async function getWatchlist(): Promise<InternationalTicker[]> {
    const collection = await getCollection();
    return collection.find({}).sort({ addedAt: -1 }).toArray();
}

/**
 * Add a ticker to the watchlist
 */
export async function addToWatchlist(ticker: Omit<InternationalTicker, 'addedAt'>): Promise<void> {
    const collection = await getCollection();

    await collection.updateOne(
        { symbol: ticker.symbol },
        {
            $set: {
                ...ticker,
                addedAt: new Date(),
                includeInStrategy: false // Default to false
            },
        },
        { upsert: true }
    );
}

/**
 * Toggle strategy inclusion for a symbol
 */
export async function toggleStrategy(symbol: string, include: boolean): Promise<void> {
    const collection = await getCollection();
    await collection.updateOne(
        { symbol },
        { $set: { includeInStrategy: include } }
    );
}

/**
 * Remove a ticker from the watchlist
 */
export async function removeFromWatchlist(symbol: string): Promise<void> {
    const collection = await getCollection();
    await collection.deleteOne({ symbol });
}
