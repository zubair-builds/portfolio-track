/**
 * FIFO Preview API
 * Calculate FIFO breakdown without creating a transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import { getBuyTransactionsForSymbol } from '@/lib/transactionModel';
import { calculateFIFO, validateSellShares } from '@/lib/fifoCalculator';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.email;
    const body = await req.json();

    const symbol = body.symbol?.toUpperCase();
    const shares = parseFloat(body.shares);
    const pricePerShare = parseFloat(body.pricePerShare);
    const transactionDate = new Date(body.transactionDate);

    // Validation
    if (!symbol || isNaN(shares) || isNaN(pricePerShare)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input: symbol, shares, and price are required' },
        { status: 400 }
      );
    }

    // Get buy transactions
    const buyTransactions = await getBuyTransactionsForSymbol(userId, symbol);

    // Validate sufficient shares
    const validation = validateSellShares(buyTransactions, shares);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.message },
        { status: 400 }
      );
    }

    // Calculate FIFO
    const fifoResult = calculateFIFO(
      buyTransactions,
      shares,
      pricePerShare,
      transactionDate
    );

    return NextResponse.json({
      success: true,
      data: {
        lotsUsed: fifoResult.lotsUsed,
        totalCost: fifoResult.totalCost,
        totalProceeds: fifoResult.totalProceeds,
        realizedGain: fifoResult.realizedGain,
        totalCGT: fifoResult.totalCGT,
        netProfit: fifoResult.realizedGain - fifoResult.totalCGT,
        holdingPeriodDays: fifoResult.holdingPeriodDays,
        breakdown: fifoResult.breakdown,
      },
    });
  } catch (error: any) {
    console.error('Error calculating FIFO preview:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate preview' },
      { status: 500 }
    );
  }
}
