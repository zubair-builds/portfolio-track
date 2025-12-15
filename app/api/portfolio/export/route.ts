import { NextRequest, NextResponse } from 'next/server';
import { getUserPortfolio } from '../../../../lib/userPortfolio';
import { getUserFromRequest } from '../../../../lib/jwt';
import clientPromise from '../../../../lib/mongodb';

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

    // Get portfolio holdings (excludes watchlist as getUserPortfolio filters shares > 0)
    const portfolio = await getUserPortfolio(userId);

    if (portfolio.length === 0) {
      // Return empty export if no holdings
      const exportTime = new Date().toISOString();
      const filename = `portfolio_${userId}_${exportTime}`;

      if (format === 'csv') {
        const csv = 'Symbol,Shares,Average Buy Price,Purchase Date,Current Price,Total Dividends\n';
        return new Response(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}.csv"`,
          },
        });
      }
      return NextResponse.json([], {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      });
    }

    // Fetch current prices and dividends
    const client = await clientPromise;
    const db = client.db('portfolioTrack');
    const symbols = portfolio.map(h => h.symbol);

    // Fetch current prices
    const prices = await db
      .collection('symbol_prices')
      .find({ symbol: { $in: symbols } })
      .toArray();
    const priceMap = new Map(prices.map(p => [p.symbol, p.currentPrice]));

    // Fetch total dividends for each symbol
    const dividends = await db
      .collection('dividends')
      .aggregate([
        {
          $match: {
            userId,
            symbol: { $in: symbols }
          }
        },
        {
          $group: {
            _id: '$symbol',
            totalDividends: { $sum: '$amount' }
          }
        }
      ])
      .toArray();
    const dividendMap = new Map(dividends.map(d => [d._id, d.totalDividends]));

    // Prepare export data
    const exportData = portfolio.map(holding => ({
      symbol: holding.symbol,
      shares: holding.shares,
      avgBuy: holding.avgBuy,
      purchaseDate: holding.purchaseDate,
      currentPrice: priceMap.get(holding.symbol) || null,
      totalDividends: dividendMap.get(holding.symbol) || 0,
    }));

    // Generate filename with email and ISO timestamp
    const exportTime = new Date().toISOString();
    const filename = `portfolio_${userId}_${exportTime}`;

    if (format === 'csv') {
      // Generate CSV with new fields
      const csvHeader = 'Symbol,Shares,Average Buy Price,Purchase Date,Current Price,Total Dividends\n';
      const csvRows = exportData
        .map(
          (item) =>
            `${item.symbol},${item.shares},${item.avgBuy},${item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : 'N/A'},${item.currentPrice || 'N/A'},${item.totalDividends.toFixed(2)}`
        )
        .join('\n');

      return new Response(csvHeader + csvRows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // Default JSON format
    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export portfolio.' }, { status: 500 });
  }
}

