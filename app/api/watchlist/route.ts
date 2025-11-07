import { NextRequest, NextResponse } from 'next/server';
import {
  getUserWatchlist,
  saveWatchlistItem,
  deleteWatchlistItem,
  initializeUserWatchlist,
  WatchlistInput,
} from '../../../lib/userPortfolio';
import { initialWatchlistData } from '../../../lib/portfolioData';
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

    let watchlist = await getUserWatchlist(userId);

    // Initialize with default data ONLY on first access (never initialized before)
    if (watchlist.length === 0) {
      // Check if user has been initialized before
      const clientPromise = (await import('../../../lib/mongodb')).default;
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
      const users = db.collection('users');
      
      const user = await users.findOne({ email: userId });
      
      // Only initialize if this is truly the first time (flag not set)
      if (user && !user.watchlistInitialized) {
        const defaultItems = initialWatchlistData.map((item) => ({
          symbol: item.symbol,
          thesis: item.thesis,
          targetPrice: item.targetPrice,
          note: item.note,
        }));
        await initializeUserWatchlist(userId, defaultItems);
        watchlist = await getUserWatchlist(userId);
        
        // Mark as initialized so we don't do this again
        await users.updateOne(
          { email: userId },
          { $set: { watchlistInitialized: true } }
        );
      }
      // If watchlistInitialized is true, user has intentionally emptied their watchlist
      // Return empty array (don't re-initialize)
    }

    return NextResponse.json({ watchlist }, { status: 200 });
  } catch (error) {
    console.error('Watchlist GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist.' }, { status: 500 });
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
    const { symbol, thesis, targetPrice, note } = body;

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Invalid symbol.' }, { status: 400 });
    }

    const input: WatchlistInput = { 
      symbol, 
      thesis, 
      targetPrice: targetPrice ? Number(targetPrice) : undefined,
      note,
    };
    
    await saveWatchlistItem(userId, input);

    return NextResponse.json(
      { success: true, message: `${symbol.toUpperCase()} added to watchlist.` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Watchlist POST error:', error);
    return NextResponse.json({ error: 'Failed to save item to watchlist.' }, { status: 500 });
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

    await deleteWatchlistItem(userId, symbol);

    return NextResponse.json(
      { success: true, message: `${symbol.toUpperCase()} removed from watchlist.` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Watchlist DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete item from watchlist.' }, { status: 500 });
  }
}

