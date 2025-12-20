import { NextRequest, NextResponse } from 'next/server';
import { syncNAVForAllFunds, syncNAVForFunds } from '../../../../lib/mutualFundNavStore';
import { getUserFromRequest } from '../../../../lib/jwt';

function getUserIdFromRequest(request: NextRequest): string | null {
  const jwtUser = getUserFromRequest(request);
  if (jwtUser) return jwtUser.email;
  const userIdHeader = request.headers.get('X-User-Id');
  return userIdHeader;
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide X-User-Id header.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fundCodes } = body;

    let result;
    if (fundCodes && Array.isArray(fundCodes) && fundCodes.length > 0) {
      // Sync specific funds
      result = await syncNAVForFunds(fundCodes);
    } else {
      // Sync all funds
      result = await syncNAVForAllFunds();
    }

    return NextResponse.json({
      success: result.success,
      fundsUpdated: result.fundsUpdated,
      fundsFailed: result.fundsFailed,
      errors: result.errors,
      message: `NAV sync completed. Updated: ${result.fundsUpdated}, Failed: ${result.fundsFailed}`,
    });
  } catch (error) {
    console.error('Mutual Fund NAV Sync error:', error);
    return NextResponse.json({ error: 'Failed to sync NAV.' }, { status: 500 });
  }
}


