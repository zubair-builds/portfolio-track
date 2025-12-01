/**
 * Payment Dividends API
 * Get payment dividend records
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import { getPaymentDividends, getPaymentDividendStats } from '@/lib/paymentDividendModel';

/**
 * GET /api/dividends/payments
 * Get payment dividend records with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const symbol = searchParams.get('symbol') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    console.log(`[Payment API] Fetching dividends: symbol=${symbol || 'ALL'}, page=${page}, limit=${limit}`);

    const result = await getPaymentDividends({
      symbol,
      startDate,
      endDate,
      page,
      limit
    });

    console.log(`[Payment API] Found ${result.total} records`);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit)
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching payment dividends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment dividends' },
      { status: 500 }
    );
  }
}
