import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { SymbolPriceDocument } from '@/lib/symbolsStore';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
        const collection = db.collection<SymbolPriceDocument>('symbol_prices');

        // Base filter to match the companies list logic
        const filter = {
            isDebt: { $ne: true },
            name: { $exists: true, $ne: '' },
        };

        // Aggregation pipeline to calculate stats
        const stats = await collection.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalCompanies: { $sum: 1 },
                    totalMarketCap: { $sum: { $ifNull: ['$marketCap', 0] } },
                    totalVolume: { $sum: { $ifNull: ['$volume', 0] } }, // Assuming volume field exists
                    gainers: {
                        $sum: {
                            $cond: [{ $gt: ['$priceChange', 0] }, 1, 0]
                        }
                    },
                    losers: {
                        $sum: {
                            $cond: [{ $lt: ['$priceChange', 0] }, 1, 0]
                        }
                    },
                    unchanged: {
                        $sum: {
                            $cond: [{ $eq: ['$priceChange', 0] }, 1, 0]
                        }
                    }
                }
            }
        ]).toArray();

        const result = stats[0] || {
            totalCompanies: 0,
            totalMarketCap: 0,
            totalVolume: 0,
            gainers: 0,
            losers: 0,
            unchanged: 0
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching company stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch company stats' },
            { status: 500 }
        );
    }
}
