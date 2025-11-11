import { NextResponse } from 'next/server';
import { getCompanyData } from '../../../../lib/companiesStore';

/**
 * GET /api/companies/[symbol]
 * Get company data for a specific symbol from MongoDB cache
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const company = await getCompanyData(symbol);

    if (!company) {
      return NextResponse.json(
        { error: `No company data found for ${symbol}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      company,
    });
  } catch (error) {
    console.error(`Error in GET /api/companies/${(await params).symbol}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    );
  }
}

