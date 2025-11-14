import { NextRequest, NextResponse } from 'next/server';
import {
  getUserPortfolio,
  savePortfolioStock,
  deletePortfolioStock,
  initializeUserPortfolio,
  PortfolioInput,
} from '../../../lib/userPortfolio';
import { initialPortfolioData } from '../../../lib/portfolioData';
import { getUserFromRequest } from '../../../lib/jwt';

function getUserIdFromRequest(request: NextRequest): string | null {
  // Try JWT first
  const jwtUser = getUserFromRequest(request);
  if (jwtUser) return jwtUser.email;
  
  // Fallback to X-User-Id header for backward compatibility
  const userIdHeader = request.headers.get('X-User-Id');
  return userIdHeader;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide X-User-Id header.' },
        { status: 401 }
      );
    }

    let portfolio = await getUserPortfolio(userId);

    // Initialize with default data ONLY on first access (never initialized before)
    if (portfolio.length === 0) {
      // Check if user has been initialized before
      const clientPromise = (await import('../../../lib/mongodb')).default;
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
      const users = db.collection('users');
      
      const user = await users.findOne({ email: userId });
      
      // Only initialize if this is truly the first time (flag not set)
      if (user && !user.portfolioInitialized) {
        const defaultStocks = initialPortfolioData.map((stock) => ({
          symbol: stock.symbol,
          shares: stock.shares,
          avgBuy: stock.avgBuy,
          purchaseDate: stock.purchaseDate,
        }));
        await initializeUserPortfolio(userId, defaultStocks);
        portfolio = await getUserPortfolio(userId);
        
        // Mark as initialized so we don't do this again
        await users.updateOne(
          { email: userId },
          { $set: { portfolioInitialized: true } }
        );
      }
      // If portfolioInitialized is true, user has intentionally emptied their portfolio
      // Return empty array (don't re-initialize)
    }

    return NextResponse.json({ portfolio }, { status: 200 });
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide X-User-Id header.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { symbol, shares, avgBuy, purchaseDate } = body;

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Invalid symbol.' }, { status: 400 });
    }

    if (typeof shares !== 'number' || shares <= 0) {
      return NextResponse.json({ error: 'Shares must be a positive number.' }, { status: 400 });
    }

    if (typeof avgBuy !== 'number' || avgBuy <= 0) {
      return NextResponse.json({ error: 'Average buy price must be a positive number.' }, { status: 400 });
    }

    // Validate purchaseDate if provided
    let purchaseDateObj: Date | undefined;
    if (purchaseDate) {
      if (typeof purchaseDate === 'string') {
        purchaseDateObj = new Date(purchaseDate);
        if (isNaN(purchaseDateObj.getTime())) {
          return NextResponse.json({ error: 'Invalid purchase date format.' }, { status: 400 });
        }
      } else if (purchaseDate instanceof Date) {
        purchaseDateObj = purchaseDate;
      } else {
        return NextResponse.json({ error: 'Invalid purchase date format.' }, { status: 400 });
      }
    }

    const input: PortfolioInput = { symbol, shares, avgBuy, purchaseDate: purchaseDateObj };
    await savePortfolioStock(userId, input);

    return NextResponse.json(
      { success: true, message: `${symbol.toUpperCase()} added to portfolio.` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Portfolio POST error:', error);
    return NextResponse.json({ error: 'Failed to save stock to portfolio.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide X-User-Id header.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required.' }, { status: 400 });
    }

    await deletePortfolioStock(userId, symbol);

    return NextResponse.json(
      { success: true, message: `${symbol.toUpperCase()} removed from portfolio.` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Portfolio DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete stock from portfolio.' }, { status: 500 });
  }
}

