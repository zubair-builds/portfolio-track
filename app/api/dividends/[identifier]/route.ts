import { NextRequest, NextResponse } from 'next/server';
import { getDividendHistory, getDividendsByYear, getDividendSummary } from '../../../../lib/dividendsStore';
import { deleteDividend } from '../../../../lib/dividendModel';
import { getUserFromRequest } from '../../../../lib/jwt';

/**
 * GET /api/dividends/[identifier]
 * Get dividend history for a specific symbol
 * identifier is treated as the symbol
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    try {
        const { identifier } = await params;
        const symbol = identifier; // Alias for clarity

        if (!symbol) {
            return NextResponse.json(
                { error: 'Symbol parameter is required' },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');
        const limitParam = searchParams.get('limit');
        const summaryParam = searchParams.get('summary');

        // Return summary if requested
        if (summaryParam === 'true') {
            const summary = await getDividendSummary(symbol);
            return NextResponse.json({
                success: true,
                symbol: symbol.toUpperCase(),
                summary,
            });
        }

        let dividends;

        if (yearParam) {
            // Filter by year
            const year = parseInt(yearParam, 10);
            if (isNaN(year) || year < 2000 || year > 2100) {
                return NextResponse.json(
                    { error: 'Invalid year parameter' },
                    { status: 400 }
                );
            }
            dividends = await getDividendsByYear(symbol, year);
        } else {
            // Get all or limited history
            const limit = limitParam ? parseInt(limitParam, 10) : undefined;
            if (limit !== undefined && (isNaN(limit) || limit < 1)) {
                return NextResponse.json(
                    { error: 'Invalid limit parameter' },
                    { status: 400 }
                );
            }
            dividends = await getDividendHistory(symbol, limit);
        }

        return NextResponse.json({
            success: true,
            symbol: symbol.toUpperCase(),
            count: dividends.length,
            dividends,
        });
    } catch (error) {
        console.error(`Error in GET /api/dividends/[identifier]:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch dividend history' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/dividends/[identifier]
 * Delete a dividend record (admin only)
 * identifier is treated as the dividend ID
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    try {
        // Verify authentication and admin role
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { identifier } = await params;
        const id = identifier; // Alias for clarity

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Dividend ID is required' },
                { status: 400 }
            );
        }

        await deleteDividend(id);

        return NextResponse.json({
            success: true,
            message: 'Dividend deleted successfully',
        });
    } catch (error) {
        console.error('Error in DELETE /api/dividends/[identifier]:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete dividend' },
            { status: 500 }
        );
    }
}
