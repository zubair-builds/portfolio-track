import { NextRequest, NextResponse } from 'next/server';
import { savePortfolioStock, saveWatchlistItem } from '../../../../lib/userPortfolio';
import { getUserFromRequest } from '../../../../lib/jwt';

interface ImportPortfolioItem {
  symbol: string;
  shares: number;
  avgBuy: number;
}

interface ImportWatchlistItem {
  symbol: string;
  thesis?: string;
  targetPrice?: number;
  note?: string;
}

interface ImportData {
  portfolio?: ImportPortfolioItem[];
  watchlist?: ImportWatchlistItem[];
}

export async function POST(request: NextRequest) {
  try {
    const jwtUser = getUserFromRequest(request);
    const userId = jwtUser?.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json() as ImportData;
    
    if (!body.portfolio && !body.watchlist) {
      return NextResponse.json(
        { error: 'Import data must contain portfolio or watchlist array.' },
        { status: 400 }
      );
    }

    let portfolioCount = 0;
    let watchlistCount = 0;
    const errors: string[] = [];

    // Import portfolio
    if (Array.isArray(body.portfolio)) {
      for (const item of body.portfolio) {
        try {
          if (!item.symbol || typeof item.shares !== 'number' || typeof item.avgBuy !== 'number') {
            errors.push(`Invalid portfolio item: ${JSON.stringify(item)}`);
            continue;
          }

          await savePortfolioStock(userId, {
            symbol: item.symbol,
            shares: item.shares,
            avgBuy: item.avgBuy,
          });
          portfolioCount++;
        } catch (err) {
          errors.push(`Failed to import ${item.symbol}: ${err}`);
        }
      }
    }

    // Import watchlist
    if (Array.isArray(body.watchlist)) {
      for (const item of body.watchlist) {
        try {
          if (!item.symbol) {
            errors.push(`Invalid watchlist item: ${JSON.stringify(item)}`);
            continue;
          }

          await saveWatchlistItem(userId, {
            symbol: item.symbol,
            thesis: item.thesis,
            targetPrice: item.targetPrice,
            note: item.note,
          });
          watchlistCount++;
        } catch (err) {
          errors.push(`Failed to import watchlist ${item.symbol}: ${err}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${portfolioCount} stocks and ${watchlistCount} watchlist items.`,
      portfolioCount,
      watchlistCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import portfolio.' }, { status: 500 });
  }
}

