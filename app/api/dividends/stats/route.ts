import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import { getPortfolioDividendStats, getDividendStatsBySymbol } from '@/lib/paymentDividendModel';

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const includeBySymbol = searchParams.get('includeBySymbol') === 'true';

        const stats = await getPortfolioDividendStats(user.email);
        
        let bySymbol = undefined;
        if (includeBySymbol) {
            bySymbol = await getDividendStatsBySymbol(user.email);
        }

        return NextResponse.json({
            success: true,
            stats: {
                totalNet: stats.totalNetDividend || 0,
                totalGross: stats.totalGrossDividend || 0,
                totalTax: stats.totalTaxDeducted || 0,
                totalZakat: stats.totalZakatDeducted || 0,
                count: stats.count || 0,
                bySymbol: bySymbol?.map(s => ({
                    symbol: s.symbol,
                    netDividend: s.totalNetDividend,
                    grossDividend: s.totalGrossDividend,
                    taxDeducted: s.totalTaxDeducted,
                    zakatDeducted: s.totalZakatDeducted,
                    count: s.count,
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching dividend stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dividend stats' },
            { status: 500 }
        );
    }
}
