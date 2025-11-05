import { NextRequest, NextResponse } from 'next/server';
import { refreshSymbolPrices } from '../../../../lib/symbolsStore';
import { getUserPortfolio, getUserWatchlist } from '../../../../lib/userPortfolio';

/**
 * POST /api/symbols/refresh-prices
 * Fetches latest prices from PSX Terminal API and updates database
 * 
 * Body (optional):
 * - symbols: string[] - Specific symbols to refresh
 * 
 * If no symbols provided, fetches from user's portfolio + watchlist
 */
export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get('X-User-Id');
    let symbolsToRefresh: string[] = [];
    
    // Try to get symbols from request body
    try {
      const body = await request.json();
      if (body.symbols && Array.isArray(body.symbols)) {
        symbolsToRefresh = body.symbols;
      }
    } catch {
      // Body is optional, continue without it
    }
    
    // If no symbols provided and user is authenticated, get from portfolio + watchlist
    if (symbolsToRefresh.length === 0 && userEmail) {
      try {
        const [portfolio, watchlist] = await Promise.all([
          getUserPortfolio(userEmail),
          getUserWatchlist(userEmail),
        ]);
        
        const portfolioSymbols = portfolio.map(h => h.symbol);
        const watchlistSymbols = watchlist.map(w => w.symbol);
        symbolsToRefresh = [...new Set([...portfolioSymbols, ...watchlistSymbols])];
      } catch (error) {
        console.error('Error fetching user portfolio:', error);
      }
    }
    
    if (symbolsToRefresh.length === 0) {
      return NextResponse.json(
        { error: 'No symbols provided and unable to fetch from portfolio' },
        { status: 400 }
      );
    }
    
    // Refresh prices
    console.log('Refreshing prices for symbols:', symbolsToRefresh.length);
    const updateCount = await refreshSymbolPrices(symbolsToRefresh);
    
    return NextResponse.json({
      success: true,
      refreshed: updateCount,
      total: symbolsToRefresh.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error refreshing symbol prices:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to refresh prices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

