import { NextRequest, NextResponse } from 'next/server';
import { createTransactionsBulk, TransactionInput, getTransactionsForSymbols, bulkUpdateFIFO } from '../../../../lib/transactionModel';
import { recalculateFIFOForSeries } from '../../../../lib/fifoCalculator';
import { getKlineForDate } from '../../../../lib/klinesStore';
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
        const validTransactions: TransactionInput[] = [];
        const errors: string[] = [];

        for (const t of transactions) {
            const rawT = t as Record<string, unknown>;
            const symbol = String(rawT.symbol);
            const transactionDate = new Date(String(rawT.transactionDate));
            let pricePerShare = Number(rawT.pricePerShare);

            // If price is missing or 0, try to fetch from Klines
            if (!pricePerShare || pricePerShare <= 0) {
                const kline = await getKlineForDate(symbol, transactionDate);
                if (kline) {
                    pricePerShare = kline.low;
                } else {
                    errors.push(`No market data found for ${symbol} on ${transactionDate.toLocaleDateString()}. Please provide a price.`);
                    continue;
                }
            }

            validTransactions.push({
                symbol,
                transactionType: rawT.transactionType as 'BUY' | 'SELL',
                shares: Number(rawT.shares),
                pricePerShare,
                transactionDate,
                notes: rawT.notes ? String(rawT.notes) : undefined,
            });
        }

        if (errors.length > 0) {
            return NextResponse.json(
                { error: `Validation failed: ${errors.join('; ')}` },
                { status: 400 }
            );
        }

        // Insert transactions
        const result = await createTransactionsBulk(user.email, validTransactions);

        // --- FIFO Recalculation ---
        // 1. Identify affected symbols
        const affectedSymbols = [...new Set(validTransactions.map(t => t.symbol))];

        // 2. Fetch all transactions for these symbols
        const allTransactions = await getTransactionsForSymbols(user.email, affectedSymbols);

        // 3. Group by symbol
        const txBySymbol: Record<string, typeof allTransactions> = {};
        allTransactions.forEach(tx => {
            if (!txBySymbol[tx.symbol]) txBySymbol[tx.symbol] = [];
            txBySymbol[tx.symbol].push(tx);
        });

        // 4. Recalculate FIFO for each symbol
        const fifoUpdates = [];
        for (const symbol of affectedSymbols) {
            const symbolTx = txBySymbol[symbol] || [];
            const updates = recalculateFIFOForSeries(symbolTx);
            fifoUpdates.push(...updates);
        }

        // 5. Apply updates
        if (fifoUpdates.length > 0) {
            await bulkUpdateFIFO(fifoUpdates);
        }
        // --------------------------

        // Trigger portfolio sync
        // We don't await this to keep the response fast, but we log errors
        reconcileDiscrepancies(user.email).catch(err =>
            console.error('Error syncing portfolio after upload:', err)
        );

        return NextResponse.json({
            success: true,
            count: result.insertedCount,
            updatedFIFO: fifoUpdates.length,
            message: `Successfully imported ${result.insertedCount} transactions and updated FIFO for ${fifoUpdates.length} sells`,
        });

    } catch (error) {
        console.error('Error uploading transactions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
