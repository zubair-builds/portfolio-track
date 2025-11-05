import { NextRequest, NextResponse } from 'next/server';
import { getUserPortfolio, getUserWatchlist } from '../../../../lib/userPortfolio';
import { getUserFromRequest } from '../../../../lib/jwt';

export async function GET(request: NextRequest) {
  try {
    const jwtUser = getUserFromRequest(request);
    const userId = jwtUser?.email || request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const [portfolio, watchlist] = await Promise.all([
      getUserPortfolio(userId),
      getUserWatchlist(userId),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      portfolio: portfolio.map((stock) => ({
        symbol: stock.symbol,
        shares: stock.shares,
        avgBuy: stock.avgBuy,
      })),
      watchlist: watchlist.map((item) => ({
        symbol: item.symbol,
        thesis: item.thesis,
        targetPrice: item.targetPrice,
        note: item.note,
      })),
    };

    if (format === 'csv') {
      // Generate CSV for portfolio
      let csv = 'Type,Symbol,Shares,Avg Buy,Thesis,Target Price,Note\n';
      
      portfolio.forEach((stock) => {
        csv += `Portfolio,${stock.symbol},${stock.shares},${stock.avgBuy},,,\n`;
      });
      
      watchlist.forEach((item) => {
        csv += `Watchlist,${item.symbol},,,"${item.thesis || ''}",${item.targetPrice || ''},"${item.note || ''}"\n`;
      });

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="portfolio-export-${Date.now()}.csv"`,
        },
      });
    }

    // Default JSON format
    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="portfolio-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export portfolio.' }, { status: 500 });
  }
}

