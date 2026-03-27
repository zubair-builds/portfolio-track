import { NextRequest, NextResponse } from 'next/server';
import {
  getMutualFundTransactions,
  createMutualFundTransaction,
  deleteMutualFundTransaction,
  type MutualFundTransactionInput,
} from '../../../../lib/mutualFundModel';
import { getUserFromRequest } from '../../../../lib/jwt';

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

    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get('fundCode');
    const transactionType = searchParams.get('transactionType') as 'BUY' | 'SELL' | 'REDEMPTION' | 'DIVIDEND_REINVEST' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'transactionDate';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const { transactions, total } = await getMutualFundTransactions({
      userId,
      fundCode: fundCode || undefined,
      transactionType: transactionType || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Mutual Fund Transactions GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions.' }, { status: 500 });
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
    const { fundCode, transactionType, units, nav, transactionDate, notes } = body;

    if (!fundCode || typeof fundCode !== 'string') {
      return NextResponse.json({ error: 'Fund code is required.' }, { status: 400 });
    }

    if (!transactionType || !['BUY', 'SELL', 'REDEMPTION', 'DIVIDEND_REINVEST'].includes(transactionType)) {
      return NextResponse.json({ error: 'Invalid transaction type.' }, { status: 400 });
    }

    if (typeof units !== 'number' || units <= 0) {
      return NextResponse.json({ error: 'Units must be a positive number.' }, { status: 400 });
    }

    if (typeof nav !== 'number' || nav <= 0) {
      return NextResponse.json({ error: 'NAV must be a positive number.' }, { status: 400 });
    }

    let transactionDateObj: Date;
    if (typeof transactionDate === 'string') {
      transactionDateObj = new Date(transactionDate);
      if (isNaN(transactionDateObj.getTime())) {
        return NextResponse.json({ error: 'Invalid transaction date format.' }, { status: 400 });
      }
    } else if (transactionDate instanceof Date) {
      transactionDateObj = transactionDate;
    } else {
      return NextResponse.json({ error: 'Transaction date is required.' }, { status: 400 });
    }

    const input: MutualFundTransactionInput = {
      fundCode,
      transactionType,
      units,
      nav,
      transactionDate: transactionDateObj,
      notes,
    };

    const transaction = await createMutualFundTransaction(userId, input);

    // Sync holdings after transaction
    const { syncHoldingsFromTransactions } = await import('../../../../lib/mutualFundModel');
    await syncHoldingsFromTransactions(userId);

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Transaction created successfully.',
    });
  } catch (error) {
    console.error('Mutual Fund Transactions POST error:', error);
    return NextResponse.json({ error: 'Failed to create transaction.' }, { status: 500 });
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
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId parameter is required.' }, { status: 400 });
    }

    const deleted = await deleteMutualFundTransaction(userId, transactionId);

    if (!deleted) {
      return NextResponse.json({ error: 'Transaction not found or already deleted.' }, { status: 404 });
    }

    // Sync holdings after deletion
    const { syncHoldingsFromTransactions } = await import('../../../../lib/mutualFundModel');
    await syncHoldingsFromTransactions(userId);

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully.',
    });
  } catch (error) {
    console.error('Mutual Fund Transactions DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete transaction.' }, { status: 500 });
  }
}


