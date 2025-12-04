/**
 * Portfolio-Transaction Synchronization Service
 * Ensures Holdings are synchronized with Transaction history
 * Calculates realized and unrealized gains
 */

import { getTransactions, type TransactionDocument } from './transactionModel';
import { getUserPortfolio, updatePortfolioStockBySymbol, type PortfolioDocument } from './userPortfolio';
import { calculateHoldingsFromTransactions } from './fifoCalculator';

export interface HoldingWithGains extends PortfolioDocument {
  currentShares: number;
  realizedGains: number;
  totalCGTPaid: number;
  unrealizedGains?: number;
  currentPrice?: number;
  currentValue?: number;
  totalReturn?: number;
  totalReturnPercent?: number;
}

export interface PortfolioSyncResult {
  success: boolean;
  holdingsUpdated: number;
  discrepancies: string[];
  totalRealizedGains: number;
  totalCGTPaid: number;
}

/**
 * Get holdings with both realized and unrealized gains
 * Merges portfolio data with transaction history
 */
export async function getHoldingsWithGains(
  userId: string,
  currentPrices?: Map<string, number>
): Promise<HoldingWithGains[]> {
  // Get all portfolio holdings
  const portfolio = await getUserPortfolio(userId);

  // Get all transactions
  const { transactions } = await getTransactions({
    userId,
    status: 'active',
    limit: 10000, // Get all transactions
  });

  // Group transactions by symbol
  const transactionsBySymbol = new Map<string, TransactionDocument[]>();
  for (const tx of transactions) {
    const existing = transactionsBySymbol.get(tx.symbol) || [];
    existing.push(tx);
    transactionsBySymbol.set(tx.symbol, existing);
  }

  // Build holdings with gains
  const holdingsWithGains: HoldingWithGains[] = [];

  for (const holding of portfolio) {
    const symbolTransactions = transactionsBySymbol.get(holding.symbol) || [];

    // Calculate from transactions
    const txData = calculateHoldingsFromTransactions(symbolTransactions);

    // Get current price if available
    const currentPrice = currentPrices?.get(holding.symbol);
    const currentValue = currentPrice ? txData.currentShares * currentPrice : undefined;
    const unrealizedGains = currentValue
      ? currentValue - (txData.currentShares * txData.averageCost)
      : undefined;

    // Calculate total return
    const totalReturn = unrealizedGains !== undefined
      ? txData.totalRealizedGains + unrealizedGains
      : txData.totalRealizedGains;

    const totalInvested = txData.currentShares * txData.averageCost;
    const totalReturnPercent = totalInvested > 0
      ? (totalReturn / totalInvested) * 100
      : 0;

    holdingsWithGains.push({
      ...holding,
      currentShares: txData.currentShares,
      realizedGains: txData.totalRealizedGains,
      totalCGTPaid: txData.totalCGTPaid,
      unrealizedGains,
      currentPrice,
      currentValue,
      totalReturn,
      totalReturnPercent,
    });
  }

  return holdingsWithGains;
}

/**
 * Synchronize portfolio holdings with transaction history
 * Rebuilds Holdings based on transactions
 */
export async function syncPortfolioWithTransactions(
  userId: string
): Promise<PortfolioSyncResult> {
  const result: PortfolioSyncResult = {
    success: true,
    holdingsUpdated: 0,
    discrepancies: [],
    totalRealizedGains: 0,
    totalCGTPaid: 0,
  };

  try {
    // Get all transactions
    const { transactions } = await getTransactions({
      userId,
      status: 'active',
      limit: 10000,
    });

    // Group by symbol
    const transactionsBySymbol = new Map<string, TransactionDocument[]>();
    for (const tx of transactions) {
      const existing = transactionsBySymbol.get(tx.symbol) || [];
      existing.push(tx);
      transactionsBySymbol.set(tx.symbol, existing);
    }

    // Get current portfolio
    const portfolio = await getUserPortfolio(userId);

    // Check each holding
    for (const holding of portfolio) {
      const symbolTransactions = transactionsBySymbol.get(holding.symbol) || [];
      const txData = calculateHoldingsFromTransactions(symbolTransactions);

      // Check for discrepancies
      if (Math.abs(holding.shares - txData.currentShares) > 0.01) {
        result.discrepancies.push(
          `${holding.symbol}: Portfolio shows ${holding.shares} shares, transactions show ${txData.currentShares} shares`
        );

        // Update holding to match transactions
        await updatePortfolioStockBySymbol(userId, holding.symbol, {
          symbol: holding.symbol,
          shares: txData.currentShares,
          avgBuy: txData.averageCost,
          purchaseDate: txData.firstBuyDate,
        });

        result.holdingsUpdated++;
      }

      // Accumulate realized gains and CGT
      result.totalRealizedGains += txData.totalRealizedGains;
      result.totalCGTPaid += txData.totalCGTPaid;
    }

    // Check for holdings without transactions
    const portfolioSymbols = new Set(portfolio.map(h => h.symbol));
    for (const symbol of transactionsBySymbol.keys()) {
      if (!portfolioSymbols.has(symbol)) {
        const txData = calculateHoldingsFromTransactions(
          transactionsBySymbol.get(symbol)!
        );

        if (txData.currentShares > 0) {
          result.discrepancies.push(
            `${symbol}: Has ${txData.currentShares} shares in transactions but not in portfolio`
          );
        }
      }
    }

  } catch (error) {
    const err = error as Error;
    console.error('Error syncing portfolio with transactions:', err);
    result.success = false;
    result.discrepancies.push(`Sync error: ${err.message}`);
  }

  return result;
}

/**
 * Reconcile discrepancies between portfolio and transactions
 * Use transactions as source of truth
 */
export async function reconcileDiscrepancies(
  userId: string
): Promise<{ resolved: number; errors: string[] }> {
  const errors: string[] = [];
  let resolved = 0;

  try {
    // Get all transactions
    const { transactions } = await getTransactions({
      userId,
      status: 'active',
      limit: 10000,
    });

    // Group by symbol
    const transactionsBySymbol = new Map<string, TransactionDocument[]>();
    for (const tx of transactions) {
      const existing = transactionsBySymbol.get(tx.symbol) || [];
      existing.push(tx);
      transactionsBySymbol.set(tx.symbol, existing);
    }

    // Update each holding based on transactions
    for (const [symbol, symbolTransactions] of transactionsBySymbol) {
      const txData = calculateHoldingsFromTransactions(symbolTransactions);

      if (txData.currentShares > 0) {
        await updatePortfolioStockBySymbol(userId, symbol, {
          symbol,
          shares: txData.currentShares,
          avgBuy: txData.averageCost,
          purchaseDate: txData.firstBuyDate,
        });
        resolved++;
      }
    }

  } catch (error) {
    const err = error as Error;
    console.error('Error reconciling discrepancies:', err);
    errors.push(err.message);
  }

  return { resolved, errors };
}

/**
 * Calculate portfolio summary with realized/unrealized gains
 */
export async function getPortfolioSummaryWithGains(
  userId: string,
  currentPrices: Map<string, number>
): Promise<{
  totalValue: number;
  totalInvested: number;
  unrealizedGains: number;
  unrealizedGainsPercent: number;
  realizedGains: number;
  totalCGTPaid: number;
  totalGains: number;
  totalGainsPercent: number;
  netProfit: number; // Total gains - CGT
  totalDividendIncome?: number;
  totalDividendTax?: number;
  totalDividendGross?: number;
  totalDividendZakat?: number;
}> {
  const holdings = await getHoldingsWithGains(userId, currentPrices);

  let totalValue = 0;
  let totalInvested = 0;
  let unrealizedGains = 0;
  let realizedGains = 0;
  let totalCGTPaid = 0;

  for (const holding of holdings) {
    totalValue += holding.currentValue || 0;
    totalInvested += holding.currentShares * holding.avgBuy;
    unrealizedGains += holding.unrealizedGains || 0;
    realizedGains += holding.realizedGains;
    totalCGTPaid += holding.totalCGTPaid;
  }

  // Fetch total dividend income for user
  const { netDividend = 0, grossDividend = 0, taxDeducted = 0, zakatDeducted = 0 } = await import('./dividendUtils').then(m => m.getUserDividendIncome(userId));

  const unrealizedGainsPercent = totalInvested > 0
    ? (unrealizedGains / totalInvested) * 100
    : 0;

  const totalGains = realizedGains + unrealizedGains + netDividend;
  const totalGainsPercent = totalInvested > 0
    ? (totalGains / totalInvested) * 100
    : 0;

  const netProfit = totalGains - totalCGTPaid;

  return {
    totalValue,
    totalInvested,
    unrealizedGains,
    unrealizedGainsPercent,
    realizedGains,
    totalCGTPaid,
    totalGains,
    totalGainsPercent,
    netProfit,
    totalDividendIncome: netDividend,
    totalDividendTax: taxDeducted,
    totalDividendGross: grossDividend,
    totalDividendZakat: zakatDeducted,
  };
}
