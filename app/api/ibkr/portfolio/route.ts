import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist
} from '../../../../lib/internationalStore';

const yahooFinance = new YahooFinance();

// Helper to chunk array for batch processing if needed
// yahoo-finance2 quote can handle multiple symbols
async function getQuotes(symbols: string[]) {
    if (symbols.length === 0) return {};

    try {
        const results = await yahooFinance.quote(symbols);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quoteMap: Record<string, any> = {};

        // results can be a single object or array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quotes = (Array.isArray(results) ? results : [results]) as any[];

        quotes.forEach(quote => {
            quoteMap[quote.symbol] = quote;
        });

        return quoteMap;
    } catch (error) {
        console.error('Error fetching quotes:', error);
        return {};
    }
}

export async function GET() {
    try {
        const watchlist = await getWatchlist();

        // Get live prices
        const symbols = watchlist.map(item => item.symbol);
        const quotes = await getQuotes(symbols);

        // Merge data
        const enhancedWatchlist = watchlist.map(item => {
            const quote = quotes[item.symbol];
            return {
                ...item,
                price: quote?.regularMarketPrice || quote?.ask || 0,
                change: quote?.regularMarketChange || 0,
                changePercent: quote?.regularMarketChangePercent || 0,
                currency: quote?.currency || item.currency,
                marketState: quote?.marketState,
                lastUpdated: new Date()
            };
        });

        return NextResponse.json({ portfolio: enhancedWatchlist });
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return NextResponse.json(
            { error: 'Failed to fetch portfolio' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { symbol, name, exchange } = body;

        if (!symbol || !name) {
            return NextResponse.json(
                { error: 'Symbol and Name are required' },
                { status: 400 }
            );
        }

        await addToWatchlist({
            symbol,
            name,
            exchange: exchange || 'Unknown'
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        return NextResponse.json(
            { error: 'Failed to add ticker' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');

        if (!symbol) {
            return NextResponse.json(
                { error: 'Symbol is required' },
                { status: 400 }
            );
        }

        await removeFromWatchlist(symbol);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        return NextResponse.json(
            { error: 'Failed to remove ticker' },
            { status: 500 }
        );
    }
}

import { toggleStrategy } from '../../../../lib/internationalStore';

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { symbol, includeInStrategy } = body;

        if (!symbol || typeof includeInStrategy !== 'boolean') {
            return NextResponse.json(
                { error: 'Symbol and includeInStrategy boolean are required' },
                { status: 400 }
            );
        }

        await toggleStrategy(symbol, includeInStrategy);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating strategy toggle:', error);
        return NextResponse.json(
            { error: 'Failed to update strategy toggle' },
            { status: 500 }
        );
    }
}
