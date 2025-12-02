import { PaymentDividend } from '../models/paymentDividend';
import { Types } from 'mongoose';

/**
 * Aggregate total dividend income for a user (optionally by symbol and date range)
 * Returns netDividend, grossDividend, taxDeducted, zakatDeducted
 */
export async function getUserDividendIncome(
  userId: string,
  options?: {
    symbol?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const match: any = { uploadedBy: userId };
  if (options?.symbol) match.symbol = options.symbol.toUpperCase();
  if (options?.startDate || options?.endDate) {
    match.paymentDate = {};
    if (options.startDate) match.paymentDate.$gte = options.startDate;
    if (options.endDate) match.paymentDate.$lte = options.endDate;
  }

  const result = await PaymentDividend.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        netDividend: { $sum: '$netDividend' },
        grossDividend: { $sum: '$grossDividend' },
        taxDeducted: { $sum: '$taxDeducted' },
        zakatDeducted: { $sum: '$zakatDeducted' },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || {
    netDividend: 0,
    grossDividend: 0,
    taxDeducted: 0,
    zakatDeducted: 0,
    count: 0,
  };
}

/**
 * Get dividend income breakdown by symbol for a user
 */
export async function getUserDividendsBySymbol(
  userId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
  }
) {
  const match: any = { uploadedBy: userId };
  if (options?.startDate || options?.endDate) {
    match.paymentDate = {};
    if (options.startDate) match.paymentDate.$gte = options.startDate;
    if (options.endDate) match.paymentDate.$lte = options.endDate;
  }

  const results = await PaymentDividend.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$symbol',
        netDividend: { $sum: '$netDividend' },
        grossDividend: { $sum: '$grossDividend' },
        taxDeducted: { $sum: '$taxDeducted' },
        zakatDeducted: { $sum: '$zakatDeducted' },
        count: { $sum: 1 },
        lastPayment: { $max: '$paymentDate' },
      },
    },
    { $sort: { netDividend: -1 } },
  ]);

  return results.map((r) => ({
    symbol: r._id,
    netDividend: r.netDividend,
    grossDividend: r.grossDividend,
    taxDeducted: r.taxDeducted,
    zakatDeducted: r.zakatDeducted,
    count: r.count,
    lastPayment: r.lastPayment,
  }));
}
