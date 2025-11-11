import { NextResponse } from 'next/server';
import { saveCompanyData, type CompanyData } from '../../../../../lib/companiesStore';

const PSX_API_BASE = 'https://psxterminal.com/api';

interface PSXCompanyResponse {
  success: boolean;
  data: {
    symbol: string;
    scrapedAt: string;
    financialStats: {
      marketCap: {
        raw: string;
        numeric: number;
      };
      shares: {
        raw: string;
        numeric: number;
      };
      freeFloat: {
        raw: string;
        numeric: number;
      };
      freeFloatPercent: {
        raw: string;
        numeric: number;
      };
    };
    businessDescription: string;
    keyPeople: Array<{
      name: string;
      position: string;
    }>;
    error: null | string;
  };
  timestamp: number;
}

async function fetchCompanyFromPSX(symbol: string): Promise<PSXCompanyResponse | null> {
  try {
    const response = await fetch(`${PSX_API_BASE}/companies/${symbol.toUpperCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://psxterminal.com/',
      },
      next: { revalidate: 0 }, // Don't cache
    });

    if (!response.ok) {
      console.error(`PSX API returned ${response.status} for ${symbol}`);
      return null;
    }

    const data: PSXCompanyResponse = await response.json();

    if (!data.success || !data.data || data.data.error) {
      console.error(`PSX API error for ${symbol}:`, data.data?.error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Failed to fetch company data for ${symbol}:`, error);
    return null;
  }
}

/**
 * GET /api/companies/[symbol]/refresh
 * Fetch fresh company data from PSX Terminal API and update MongoDB
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

    // Fetch from PSX Terminal API
    const psxData = await fetchCompanyFromPSX(symbol);

    if (!psxData || !psxData.data) {
      return NextResponse.json(
        { error: `No company data available for ${symbol} from PSX Terminal` },
        { status: 404 }
      );
    }

    // Transform PSX data to our schema
    const companyData: CompanyData = {
      symbol: psxData.data.symbol.toUpperCase(),
      marketCap: psxData.data.financialStats.marketCap.numeric,
      shares: psxData.data.financialStats.shares.numeric,
      freeFloat: psxData.data.financialStats.freeFloat.numeric,
      freeFloatPercent: psxData.data.financialStats.freeFloatPercent.numeric,
      businessDescription: psxData.data.businessDescription,
      keyPeople: psxData.data.keyPeople,
      scrapedAt: new Date(psxData.data.scrapedAt),
      lastUpdated: new Date(),
    };

    // Save to MongoDB (will auto-track free float changes)
    await saveCompanyData(companyData);

    return NextResponse.json({
      success: true,
      company: companyData,
      message: `Company data refreshed for ${symbol}`,
    });
  } catch (error) {
    console.error(`Error in GET /api/companies/${(await params).symbol}/refresh:`, error);
    return NextResponse.json(
      { error: 'Failed to refresh company data' },
      { status: 500 }
    );
  }
}

