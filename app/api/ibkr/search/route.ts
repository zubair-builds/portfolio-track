import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = await yahooFinance.search(query) as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quotes = results.quotes as any[];

        // Filter to only equity and etf
        const filteredResults = quotes.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (quote: any) =>
                (quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF') &&
                quote.symbol &&
                quote.shortname
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).map((quote: any) => ({
            symbol: quote.symbol,
            name: quote.shortname || quote.longname,
            exchange: quote.exchange,
            type: quote.quoteType
        }));

        return NextResponse.json({ results: filteredResults });
    } catch (error) {
        console.error('Error searching Yahoo Finance:', error);
        return NextResponse.json(
            { error: 'Failed to search symbols' },
            { status: 500 }
        );
    }
}
