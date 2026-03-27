import { NextRequest, NextResponse } from 'next/server';
import { getUserPortfolio } from '../../../lib/userPortfolio';
import { getUserFromRequest } from '../../../lib/jwt';

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT
    const jwtUser = getUserFromRequest(request);
    const userId = jwtUser?.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const portfolio = await getUserPortfolio(userId);

    if (portfolio.length === 0) {
      return NextResponse.json({
        analytics: {
          totalStocks: 0,
          totalInvestment: 0,
          sectorDiversification: [],
          largestPosition: null,
          averageHoldingSize: 0,
          concentrationRisk: 0,
        },
      });
    }

    // Calculate analytics
    const totalStocks = portfolio.length;
    const totalInvestment = portfolio.reduce((sum, stock) => sum + (stock.shares * stock.avgBuy), 0);
    const averageHoldingSize = totalInvestment / totalStocks;

    // Find largest position
    const positions = portfolio.map((stock) => ({
      symbol: stock.symbol,
      value: stock.shares * stock.avgBuy,
      percentage: 0, // Will calculate below
    }));

    positions.forEach((pos) => {
      pos.percentage = (pos.value / totalInvestment) * 100;
    });

    const largestPosition = positions.reduce((max, pos) => 
      pos.value > max.value ? pos : max
    , positions[0]);

    // Concentration risk (top 5 holdings as % of portfolio)
    const topFive = positions
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const concentrationRisk = topFive.reduce((sum, pos) => sum + pos.percentage, 0);

    return NextResponse.json({
      analytics: {
        totalStocks,
        totalInvestment,
        averageHoldingSize,
        largestPosition: {
          symbol: largestPosition.symbol,
          value: largestPosition.value,
          percentage: largestPosition.percentage,
        },
        concentrationRisk,
        topFiveHoldings: topFive,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics.' }, { status: 500 });
  }
}

