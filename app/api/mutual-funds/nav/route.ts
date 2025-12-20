import { NextRequest, NextResponse } from 'next/server';
import {
  getMutualFundNAVHistory,
  saveMutualFundNAV,
  getMutualFund,
  type MutualFundNAVInput,
} from '../../../../lib/mutualFundModel';
import { saveBulkNAV, getNAVStats } from '../../../../lib/mutualFundNavStore';
import { getUserFromRequest } from '../../../../lib/jwt';

function getUserIdFromRequest(request: NextRequest): string | null {
  const jwtUser = getUserFromRequest(request);
  if (jwtUser) return jwtUser.email;
  const userIdHeader = request.headers.get('X-User-Id');
  return userIdHeader;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get('fundCode');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    const stats = searchParams.get('stats') === 'true';

    if (!fundCode) {
      return NextResponse.json({ error: 'fundCode parameter is required.' }, { status: 400 });
    }

    if (stats) {
      // Return NAV statistics
      const days = parseInt(searchParams.get('days') || '30', 10);
      const navStats = await getNAVStats(fundCode, days);
      return NextResponse.json({ stats: navStats });
    }

    // Return NAV history
    const history = await getMutualFundNAVHistory(
      fundCode,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      limit
    );

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Mutual Fund NAV GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch NAV history.' }, { status: 500 });
  }
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
    const { fundCode, nav, date, source, bulk } = body;

    // Handle bulk upload
    if (bulk && Array.isArray(bulk)) {
      const { saved, errors } = await saveBulkNAV(bulk);
      return NextResponse.json({
        success: true,
        saved,
        errors,
        message: `Saved ${saved} NAV entries.`,
      });
    }

    // Single NAV entry
    if (!fundCode || typeof fundCode !== 'string') {
      return NextResponse.json({ error: 'Fund code is required.' }, { status: 400 });
    }

    if (typeof nav !== 'number' || nav <= 0) {
      return NextResponse.json({ error: 'NAV must be a positive number.' }, { status: 400 });
    }

    let dateObj: Date;
    if (date) {
      if (typeof date === 'string') {
        dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 });
        }
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 });
      }
    } else {
      dateObj = new Date();
    }

    // Ensure fund exists
    let fund = await getMutualFund(fundCode);
    if (!fund) {
      return NextResponse.json(
        { error: `Fund with code ${fundCode} not found. Please create the fund first.` },
        { status: 404 }
      );
    }

    const input: MutualFundNAVInput = {
      fundCode,
      nav,
      date: dateObj,
      source: source || 'manual',
    };

    await saveMutualFundNAV(input);

    return NextResponse.json({
      success: true,
      message: 'NAV saved successfully.',
    });
  } catch (error) {
    console.error('Mutual Fund NAV POST error:', error);
    return NextResponse.json({ error: 'Failed to save NAV.' }, { status: 500 });
  }
}


