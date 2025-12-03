import { NextRequest, NextResponse } from 'next/server';
import { createTransactionsBulk, TransactionInput } from '../../../../lib/transactionModel';
import { getUserFromRequest } from '../../../../lib/jwt';
import { reconcileDiscrepancies } from '../../../../lib/portfolioTransactionSync';

export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { transactions } = body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return NextResponse.json(
                { error: 'Invalid input: transactions array is required' },
                { status: 400 }
            );
        }

        // Validate and format transactions
        const validTransactions: TransactionInput[] = transactions.map((t: Record<string, unknown>) => ({
            symbol: String(t.symbol),
            transactionType: t.transactionType as 'BUY' | 'SELL',
            shares: Number(t.shares),
            pricePerShare: Number(t.pricePerShare),
            transactionDate: new Date(String(t.transactionDate)),
            notes: t.notes ? String(t.notes) : undefined,
        }));

        // Insert transactions
        const result = await createTransactionsBulk(user.email, validTransactions);

        // Trigger portfolio sync
        // We don't await this to keep the response fast, but we log errors
        reconcileDiscrepancies(user.email).catch(err =>
            console.error('Error syncing portfolio after upload:', err)
        );

        return NextResponse.json({
            success: true,
            count: result.insertedCount,
            message: `Successfully imported ${result.insertedCount} transactions`,
        });

    } catch (error) {
        console.error('Error uploading transactions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
