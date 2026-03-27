import { NextRequest, NextResponse } from 'next/server';
import {
  getUserMutualFundHoldings,
  saveMutualFundHolding,
  deleteMutualFundHolding,
  syncHoldingsFromTransactions,
  createOrUpdateMutualFund,
  deleteAllMutualFundTransactionsForFund,
  type MutualFundHoldingInput,
} from '../../../lib/mutualFundModel';
import { getCurrentNAV } from '../../../lib/mutualFundNavStore';
import { getUserFromRequest } from '../../../lib/jwt';

function getUserIdFromRequest(request: NextRequest): string | null {
  const jwtUser = getUserFromRequest(request);
  return jwtUser?.email ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    let holdings = await getUserMutualFundHoldings(userId);

    // Sync holdings from transactions if needed
    // This ensures holdings are up-to-date with transactions
    await syncHoldingsFromTransactions(userId);
    holdings = await getUserMutualFundHoldings(userId);

    // Enrich with current NAV
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const currentNAV = await getCurrentNAV(holding.fundCode);
        const currentValue = currentNAV ? holding.totalUnits * currentNAV : undefined;
        return {
          ...holding,
          currentNAV,
          currentValue,
        };
      })
    );

    return NextResponse.json({ holdings: enrichedHoldings }, { status: 200 });
  } catch (error) {
    console.error('Mutual Funds GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch mutual fund holdings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fundCode, fundName, totalUnits, averageNAV, firstPurchaseDate, amc, category } = body;

    if (!fundCode || typeof fundCode !== 'string') {
      return NextResponse.json({ error: 'Fund code is required.' }, { status: 400 });
    }

    if (typeof totalUnits !== 'number' || totalUnits <= 0) {
      return NextResponse.json({ error: 'Total units must be a positive number.' }, { status: 400 });
    }

    if (typeof averageNAV !== 'number' || averageNAV <= 0) {
      return NextResponse.json({ error: 'Average NAV must be a positive number.' }, { status: 400 });
    }

    if (!fundName || typeof fundName !== 'string') {
      return NextResponse.json({ error: 'Fund name is required.' }, { status: 400 });
    }

    // Create or update fund metadata
    await createOrUpdateMutualFund({
      fundCode,
      fundName,
      amc,
      category,
    });

    // Validate purchase date if provided
    let purchaseDateObj: Date | undefined;
    if (firstPurchaseDate) {
      if (typeof firstPurchaseDate === 'string') {
        purchaseDateObj = new Date(firstPurchaseDate);
        if (isNaN(purchaseDateObj.getTime())) {
          return NextResponse.json({ error: 'Invalid purchase date format.' }, { status: 400 });
        }
      } else if (firstPurchaseDate instanceof Date) {
        purchaseDateObj = firstPurchaseDate;
      } else {
        return NextResponse.json({ error: 'Invalid purchase date format.' }, { status: 400 });
      }
    }

    const input: MutualFundHoldingInput = {
      fundCode,
      fundName,
      totalUnits,
      averageNAV,
      firstPurchaseDate: purchaseDateObj,
    };

    await saveMutualFundHolding(userId, input);

    // Create corresponding BUY transaction
    try {
      const { createMutualFundTransaction } = await import('../../../lib/mutualFundModel');
      await createMutualFundTransaction(userId, {
        fundCode,
        transactionType: 'BUY',
        units: totalUnits,
        nav: averageNAV,
        transactionDate: purchaseDateObj || new Date(),
        notes: 'Auto-created from holding addition',
      });
    } catch (txError) {
      console.error('Failed to create BUY transaction:', txError);
      // Don't fail the holding save if transaction creation fails
    }

    return NextResponse.json(
      { success: true, message: `${fundName} added to portfolio.` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Mutual Funds POST error:', error);
    return NextResponse.json({ error: 'Failed to save mutual fund holding.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get('fundCode');

    if (!fundCode) {
      return NextResponse.json({ error: 'fundCode parameter is required.' }, { status: 400 });
    }

    // Delete all related transactions first
    const deletedTxCount = await deleteAllMutualFundTransactionsForFund(userId, fundCode);
    
    // Then delete the holding
    await deleteMutualFundHolding(userId, fundCode);

    return NextResponse.json({
      success: true,
      message: `Mutual fund holding and ${deletedTxCount} transaction(s) removed from portfolio.`,
    }, { status: 200 });
  } catch (error) {
    console.error('Mutual Funds DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete mutual fund holding.' }, { status: 500 });
  }
}


