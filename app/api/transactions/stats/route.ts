/**
 * Transaction Statistics API
 * Get summary statistics for user's transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import { getTransactionStats } from '@/lib/transactionModel';

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.email;
    const stats = await getTransactionStats(userId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
