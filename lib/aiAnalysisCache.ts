import type { Collection, Db } from 'mongodb';
import clientPromise from './mongodb';

interface AIAnalysisDocument {
  _id?: string;
  symbol: string;
  mode: 'stock' | 'portfolio' | 'market';
  content: string;
  portfolioSymbols?: string[]; // For portfolio mode
  createdAt: Date;
  updatedAt: Date;
}

const ANALYSIS_COLLECTION = 'ai_analysis_cache';
const CACHE_TTL_HOURS = 24 * 7;

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
}

async function getCollection(): Promise<Collection<AIAnalysisDocument>> {
  const db = await getDb();
  const collection = db.collection<AIAnalysisDocument>(ANALYSIS_COLLECTION);
  
  try {
    // Create compound index for querying
    await collection.createIndex({ symbol: 1, mode: 1 });
  } catch (error) {
    // Index already exists, ignore
  }

  try {
    // Create TTL index for auto-expiration
    await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: CACHE_TTL_HOURS * 60 * 60 });
  } catch (error: any) {
    // If index exists with different options, drop and recreate
    if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
      console.log('Dropping existing createdAt index to recreate with new TTL...');
      try {
        await collection.dropIndex('createdAt_1');
        await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: CACHE_TTL_HOURS * 60 * 60 });
        console.log('Successfully recreated TTL index with 7-day expiration');
      } catch (dropError) {
        console.error('Error recreating TTL index:', dropError);
      }
    }
  }
  
  return collection;
}

export async function getCachedAnalysis(
  mode: 'stock' | 'portfolio' | 'market',
  symbol?: string,
  portfolioSymbols?: string[]
): Promise<{ content: string; createdAt: Date } | null> {
  try {
    const collection = await getCollection();

    let query: any = { mode };

    if (mode === 'stock' && symbol) {
      query.symbol = symbol.toUpperCase();
    } else if (mode === 'portfolio' && portfolioSymbols) {
      // For portfolio mode, match by sorted symbols array
      query.portfolioSymbols = { $all: portfolioSymbols.map(s => s.toUpperCase()) };
    } else if (mode === 'market') {
      query.symbol = 'MARKET_OVERVIEW';
    }

    const cached = await collection.findOne(query, {
      sort: { createdAt: -1 },
    });
    console.log('cached', cached);
    if (!cached) return null;

    return {
      content: cached.content,
      createdAt: cached.createdAt,
    };
  } catch (error) {
    console.error('Error fetching cached analysis:', error);
    return null;
  }
}

export async function saveAnalysis(
  mode: 'stock' | 'portfolio' | 'market',
  content: string,
  symbol?: string,
  portfolioSymbols?: string[]
): Promise<void> {
  try {
    const collection = await getCollection();
    const now = new Date();

    let identifierSymbol = 'MARKET_OVERVIEW';
    let portfolioSymbolsArray: string[] | undefined;

    if (mode === 'stock' && symbol) {
      identifierSymbol = symbol.toUpperCase();
    } else if (mode === 'portfolio' && portfolioSymbols) {
      identifierSymbol = `PORTFOLIO_${portfolioSymbols.length}`;
      portfolioSymbolsArray = portfolioSymbols.map(s => s.toUpperCase()).sort();
    }

    const document: AIAnalysisDocument = {
      symbol: identifierSymbol,
      mode,
      content,
      portfolioSymbols: portfolioSymbolsArray,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(document);
  } catch (error) {
    console.error('Error saving analysis to cache:', error);
  }
}

export async function clearAnalysisCache(
  mode?: 'stock' | 'portfolio' | 'market',
  symbol?: string
): Promise<void> {
  try {
    const collection = await getCollection();

    if (!mode) {
      await collection.deleteMany({});
      return;
    }

    let query: any = { mode };

    if (mode === 'stock' && symbol) {
      query.symbol = symbol.toUpperCase();
    } else if (mode === 'market') {
      query.symbol = 'MARKET_OVERVIEW';
    }

    await collection.deleteMany(query);
  } catch (error) {
    console.error('Error clearing analysis cache:', error);
  }
}

export async function getAnalysisHistory(
  mode?: 'stock' | 'portfolio' | 'market',
  symbol?: string,
  limit: number = 10
): Promise<Array<{ _id: string; symbol: string; mode: string; createdAt: Date; portfolioSymbols?: string[] }>> {
  try {
    const collection = await getCollection();

    let query: any = {};

    if (mode) {
      query.mode = mode;
      
      if (mode === 'stock' && symbol) {
        query.symbol = symbol.toUpperCase();
      } else if (mode === 'market') {
        query.symbol = 'MARKET_OVERVIEW';
      }
    }

    const history = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({ _id: 1, symbol: 1, mode: 1, createdAt: 1, portfolioSymbols: 1 })
      .toArray();

    return history.map(doc => ({
      _id: doc._id?.toString() || '',
      symbol: doc.symbol,
      mode: doc.mode,
      createdAt: doc.createdAt,
      portfolioSymbols: doc.portfolioSymbols,
    }));
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return [];
  }
}

export async function getAnalysisById(
  id: string
): Promise<{ content: string; createdAt: Date; mode: string; symbol: string; portfolioSymbols?: string[] } | null> {
  try {
    const collection = await getCollection();
    const { ObjectId } = await import('mongodb');
    
    const analysis = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!analysis) return null;

    return {
      content: analysis.content,
      createdAt: analysis.createdAt,
      mode: analysis.mode,
      symbol: analysis.symbol,
      portfolioSymbols: analysis.portfolioSymbols,
    };
  } catch (error) {
    console.error('Error fetching analysis by ID:', error);
    return null;
  }
}

