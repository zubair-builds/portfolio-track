/**
 * FIFO (First In, First Out) Calculator for Stock Transactions
 * Calculates realized gains, holding periods, and CGT for sell transactions
 */

import type { TransactionDocument, FIFOLot } from './transactionModel';
import { CGT_RATE } from './constants';

export interface FIFOCalculationResult {
  lotsUsed: FIFOLot[];
  totalCost: number;
  totalProceeds: number;
  realizedGain: number;
  totalCGT: number;
  holdingPeriodDays: number; // Weighted average
  breakdown: string[]; // Human-readable breakdown
  remainingShares: number; // Shares that couldn't be matched (error case)
}

/**
 * Calculate realized gains using FIFO method
 * @param buyTransactions - All BUY transactions for the symbol, sorted by date (oldest first)
 * @param sellShares - Number of shares being sold
 * @param sellPrice - Price per share for the sale
 * @param sellDate - Date of the sale
 * @returns FIFO calculation results
 */
export function calculateFIFO(
  buyTransactions: TransactionDocument[],
  sellShares: number,
  sellPrice: number,
  sellDate: Date
): FIFOCalculationResult {
  const lotsUsed: FIFOLot[] = [];
  const breakdown: string[] = [];

  let remainingToSell = sellShares;
  let totalCost = 0;
  const totalProceeds = sellShares * sellPrice;
  let totalWeightedHoldingDays = 0;

  // Process buy transactions in FIFO order (oldest first)
  for (const buyTx of buyTransactions) {
    if (remainingToSell <= 0) break;

    // Determine how many shares to use from this lot
    const sharesToUse = Math.min(remainingToSell, buyTx.shares);

    // Calculate holding period
    const holdingDays = Math.floor(
      (sellDate.getTime() - buyTx.transactionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate gain for this lot
    const costForThisLot = sharesToUse * buyTx.pricePerShare;
    const proceedsForThisLot = sharesToUse * sellPrice;
    const gainForThisLot = proceedsForThisLot - costForThisLot;

    // Calculate CGT for this lot (only on positive gains)
    const cgtForThisLot = gainForThisLot > 0 ? gainForThisLot * CGT_RATE : 0;

    // Add to total cost
    totalCost += costForThisLot;

    // Add to weighted holding days (weight by shares used)
    totalWeightedHoldingDays += holdingDays * sharesToUse;

    // Create FIFO lot record
    const lot: FIFOLot = {
      buyTransactionId: buyTx._id!.toString(),
      shares: sharesToUse,
      buyPrice: buyTx.pricePerShare,
      buyDate: buyTx.transactionDate,
      holdingDays,
      gain: gainForThisLot,
      cgtAmount: cgtForThisLot,
    };

    lotsUsed.push(lot);

    // Add to breakdown
    const holdingLabel = holdingDays >= 365 ? 'Long-term' : 'Short-term';
    breakdown.push(
      `Lot ${lotsUsed.length}: ${sharesToUse.toLocaleString()} shares @ ${buyTx.pricePerShare.toFixed(
        2
      )} (bought ${buyTx.transactionDate.toLocaleDateString()}, held ${holdingDays} days - ${holdingLabel}), Gain: ${gainForThisLot.toFixed(
        2
      )}, CGT: ${cgtForThisLot.toFixed(2)}`
    );

    remainingToSell -= sharesToUse;
  }

  // Calculate totals
  const realizedGain = totalProceeds - totalCost;
  const totalCGT = realizedGain > 0 ? realizedGain * CGT_RATE : 0;
  const avgHoldingDays = sellShares > 0 ? Math.floor(totalWeightedHoldingDays / sellShares) : 0;

  return {
    lotsUsed,
    totalCost,
    totalProceeds,
    realizedGain,
    totalCGT,
    holdingPeriodDays: avgHoldingDays,
    breakdown,
    remainingShares: remainingToSell,
  };
}

/**
 * Validate if enough shares are available for a sell transaction
 * @param buyTransactions - All BUY transactions for the symbol
 * @param sellShares - Number of shares to sell
 * @returns Object with isValid flag and available shares count
 */
export function validateSellShares(
  buyTransactions: TransactionDocument[],
  sellShares: number
): { isValid: boolean; availableShares: number; message?: string } {
  const totalBuyShares = buyTransactions.reduce((sum, tx) => sum + tx.shares, 0);

  if (sellShares > totalBuyShares) {
    return {
      isValid: false,
      availableShares: totalBuyShares,
      message: `Cannot sell ${sellShares} shares. Only ${totalBuyShares} shares available.`,
    };
  }

  return {
    isValid: true,
    availableShares: totalBuyShares,
  };
}

/**
 * Calculate current holdings from transaction history
 * @param transactions - All transactions (BUY and SELL) for a symbol
 * @returns Current shares, average cost, realized gains
 */
export function calculateHoldingsFromTransactions(transactions: TransactionDocument[]): {
  currentShares: number;
  averageCost: number;
  totalInvested: number;
  totalRealizedGains: number;
  totalCGTPaid: number;
} {
  let currentShares = 0;
  let totalCost = 0;
  let totalRealizedGains = 0;
  let totalCGTPaid = 0;

  // Sort by date to ensure proper order
  const sortedTx = [...transactions].sort(
    (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime()
  );

  for (const tx of sortedTx) {
    if (tx.transactionType === 'BUY') {
      currentShares += tx.shares;
      totalCost += tx.totalAmount;
    } else if (tx.transactionType === 'SELL') {
      currentShares -= tx.shares;
      if (tx.realizedGain !== undefined) {
        totalRealizedGains += tx.realizedGain;
      }
      if (tx.cgtAmount !== undefined) {
        totalCGTPaid += tx.cgtAmount;
      }
    }
  }

  const averageCost = currentShares > 0 ? totalCost / currentShares : 0;

  return {
    currentShares,
    averageCost,
    totalInvested: totalCost,
    totalRealizedGains,
    totalCGTPaid,
  };
}

/**
 * Format FIFO breakdown for display
 * @param result - FIFO calculation result
 * @returns Formatted string for UI display
 */
export function formatFIFOBreakdown(result: FIFOCalculationResult): string {
  const lines = [
    '--- FIFO Breakdown ---',
    ...result.breakdown,
    '---',
    `Total Cost: ${result.totalCost.toFixed(2)}`,
    `Total Proceeds: ${result.totalProceeds.toFixed(2)}`,
    `Realized Gain: ${result.realizedGain.toFixed(2)}`,
    `CGT (15%): ${result.totalCGT.toFixed(2)}`,
    `Net Profit: ${(result.realizedGain - result.totalCGT).toFixed(2)}`,
    `Avg Holding Period: ${result.holdingPeriodDays} days`,
  ];

  if (result.remainingShares > 0) {
    lines.push(`⚠️ Warning: ${result.remainingShares} shares could not be matched to buy lots`);
  }

  return lines.join('\n');
}

/**
 * Get holding period label
 */
export function getHoldingPeriodLabel(days: number): string {
  if (days < 30) return 'Very Short-term';
  if (days < 365) return 'Short-term';
  return 'Long-term';
}
