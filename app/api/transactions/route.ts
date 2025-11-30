/**
 * Transactions API
 * Handles CRUD operations for stock transactions (BUY/SELL)
 * Integrates with FIFO calculator for realized gains
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getBuyTransactionsForSymbol,
  updateSellTransactionWithFIFO,
  getTransactionStats,
  type TransactionInput,
  type TransactionFilter,
} from '@/lib/transactionModel';
import { calculateFIFO, validateSellShares } from '@/lib/fifoCalculator';

/**
 * GET /api/transactions
 * Get transactions with filtering and pagination
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.email;
    const { searchParams } = new URL(req.url);

    // Build filter from query params
    const filter: TransactionFilter = {
      userId,
      symbol: searchParams.get('symbol') || undefined,
      transactionType: (searchParams.get('type') as 'BUY' | 'SELL') || undefined,
      status: (searchParams.get('status') as 'active' | 'deleted') || 'active',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // Date range filter
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate) filter.startDate = new Date(startDate);
    if (endDate) filter.endDate = new Date(endDate);

    const result = await getTransactions(filter);

    return NextResponse.json({
      success: true,
      data: {
        transactions: result.transactions,
        total: result.total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(result.total / (filter.limit || 50)),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions
 * Create a new transaction (BUY or SELL)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.email;
    const body = await req.json();

    // Validate input
    const input: TransactionInput = {
      symbol: body.symbol?.toUpperCase(),
      transactionType: body.transactionType,
      shares: parseFloat(body.shares),
      pricePerShare: parseFloat(body.pricePerShare),
      transactionDate: new Date(body.transactionDate),
      notes: body.notes,
    };

    if (!input.symbol || !input.transactionType || isNaN(input.shares) || isNaN(input.pricePerShare)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input: symbol, type, shares, and price are required' },
        { status: 400 }
      );
    }

    if (input.shares <= 0 || input.pricePerShare <= 0) {
      return NextResponse.json(
        { success: false, error: 'Shares and price must be positive numbers' },
        { status: 400 }
      );
    }

    if (!['BUY', 'SELL'].includes(input.transactionType)) {
      return NextResponse.json(
        { success: false, error: 'Transaction type must be BUY or SELL' },
        { status: 400 }
      );
    }

    // For SELL transactions, validate and calculate FIFO
    if (input.transactionType === 'SELL') {
      const buyTransactions = await getBuyTransactionsForSymbol(userId, input.symbol);

      // Validate sufficient shares
      const validation = validateSellShares(buyTransactions, input.shares);
      if (!validation.isValid) {
        return NextResponse.json(
          { success: false, error: validation.message },
          { status: 400 }
        );
      }

      // Create SELL transaction
      const transaction = await createTransaction(userId, input);

      // Calculate FIFO
      const fifoResult = calculateFIFO(
        buyTransactions,
        input.shares,
        input.pricePerShare,
        input.transactionDate
      );

      // Update transaction with FIFO results
      await updateSellTransactionWithFIFO(transaction._id!.toString(), {
        realizedGain: fifoResult.realizedGain,
        cgtAmount: fifoResult.totalCGT,
        holdingPeriodDays: fifoResult.holdingPeriodDays,
        lotsUsed: fifoResult.lotsUsed,
      });

      return NextResponse.json({
        success: true,
        data: {
          transaction,
          fifo: {
            realizedGain: fifoResult.realizedGain,
            cgtAmount: fifoResult.totalCGT,
            netProfit: fifoResult.realizedGain - fifoResult.totalCGT,
            holdingPeriodDays: fifoResult.holdingPeriodDays,
            breakdown: fifoResult.breakdown,
          },
        },
      });
    }

    // For BUY transactions, just create
    const transaction = await createTransaction(userId, input);

    return NextResponse.json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/transactions
 * Update an existing transaction
 */
export async function PUT(req: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.email;
    const body = await req.json();

    if (!body.transactionId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get existing transaction
    const existingTx = await getTransactionById(userId, body.transactionId);
    if (!existingTx) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Build updates
    const updates: Partial<TransactionInput> = {};
    if (body.shares !== undefined) updates.shares = parseFloat(body.shares);
    if (body.pricePerShare !== undefined) updates.pricePerShare = parseFloat(body.pricePerShare);
    if (body.transactionDate !== undefined) updates.transactionDate = new Date(body.transactionDate);
    if (body.notes !== undefined) updates.notes = body.notes;

    // Update transaction
    const updated = await updateTransaction(userId, body.transactionId, updates);

    // If this is a SELL transaction and key fields changed, recalculate FIFO
    if (updated && existingTx.transactionType === 'SELL') {
      const buyTransactions = await getBuyTransactionsForSymbol(userId, existingTx.symbol);

      const fifoResult = calculateFIFO(
        buyTransactions,
        updated.shares,
        updated.pricePerShare,
        updated.transactionDate
      );

      await updateSellTransactionWithFIFO(body.transactionId, {
        realizedGain: fifoResult.realizedGain,
        cgtAmount: fifoResult.totalCGT,
        holdingPeriodDays: fifoResult.holdingPeriodDays,
        lotsUsed: fifoResult.lotsUsed,
      });
    }

    return NextResponse.json({
      success: true,
      data: { transaction: updated },
      message: 'Transaction updated successfully',
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transactions
 * Soft delete a transaction
 */
export async function DELETE(req: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.email;
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const success = await deleteTransaction(userId, transactionId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
