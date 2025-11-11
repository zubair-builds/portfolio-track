import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies, getCompaniesBySymbols } from '../../../lib/companiesStore';

/**
 * GET /api/companies
 * List all companies or filter by symbols
 * 
 * Query params:
 * - symbols: Comma-separated list of symbols (optional)
 * 
 * Example: /api/companies?symbols=HUBC,PSO,OGDC
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');

    let companies;

    if (symbolsParam) {
      // Filter by specific symbols
      const symbols = symbolsParam.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      if (symbols.length === 0) {
        return NextResponse.json(
          { error: 'Invalid symbols parameter' },
          { status: 400 }
        );
      }

      companies = await getCompaniesBySymbols(symbols);
    } else {
      // Get all companies
      companies = await getAllCompanies();
    }

    return NextResponse.json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    console.error('Error in GET /api/companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

