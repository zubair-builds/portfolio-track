import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/jwt';
import { getDividendStatsBySymbol } from '@/lib/paymentDividendModel';

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const stats = await getDividendStatsBySymbol(user.email);

        return NextResponse.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching symbol stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch symbol stats' },
            { status: 500 }
        );
    }
}
