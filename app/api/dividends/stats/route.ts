import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import { getPortfolioDividendStats } from '@/lib/paymentDividendModel';

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const stats = await getPortfolioDividendStats(user.email);

        return NextResponse.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching dividend stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dividend stats' },
            { status: 500 }
        );
    }
}
