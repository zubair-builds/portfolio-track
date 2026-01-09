import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { getWatchlist } from '../../../../lib/internationalStore';
import { calculateIndicators, Candle } from '../../../../lib/indicators';

const yahooFinance = new YahooFinance();

export async function GET() {
    try {
        const watchlist = await getWatchlist();
        const strategySymbols = watchlist.filter(item => item.includeInStrategy);

        if (strategySymbols.length === 0) {
            return NextResponse.json({ results: [] });
        }

        const results = await Promise.all(strategySymbols.map(async (item) => {
            try {
                // Fetch 100 days of daily data to ensure enough for EMA50 + Slope
                const historical = await yahooFinance.historical(item.symbol, {
                    period1: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000), // ~150 days ago
                    period2: new Date(),
                    interval: '1d',
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const candles: Candle[] = historical.map((h: any) => ({
                    timestamp: h.date,
                    open: h.open,
                    high: h.high,
                    low: h.low,
                    close: h.close,
                    volume: h.volume
                }));

                const indicators = calculateIndicators(candles);
                const latestPrice = candles[candles.length - 1]?.close || 0;

                // --- MEAN REVERSION LOGIC v1 ---

                // 1. Stretch: (Price - EMA20) / ATR
                // Condition: Price < EMA20 - 2 * ATR  =>  (Price - EMA20) < -2 * ATR  => Stretch < -2
                let stretch = null;
                if (latestPrice && indicators.ema20 && indicators.atr14) {
                    stretch = (latestPrice - indicators.ema20) / indicators.atr14;
                }

                // 2. Context Filters
                // - Price < EMA20 - 2*ATR (Stretch < -2)
                // - RSI(14) < 30
                // - ADX(14) < 20 (Optional/Recommended) - RELAXED for now or Strict? User said "Recommended". Let's track it but maybe strict on RSI/Stretch.
                // - Flat EMA50: abs(Slope) < 0.5 * ATR

                const isStretchValid = stretch !== null && stretch < -2;
                const isRsiOversold = indicators.rsi14 !== null && indicators.rsi14 < 30;

                let isEma50Flat = false;
                if (indicators.ema50Slope !== null && indicators.atr14 !== null) {
                    isEma50Flat = indicators.ema50Slope < (0.5 * indicators.atr14);
                }

                // 3. Timing Trigger: RSI Rising
                // RSI[t] > RSI[t-1] AND RSI[t-1] <= RSI[t-2]
                let isRsiRising = false;
                if (indicators.rsi14 !== null && indicators.prevRsi14 !== null && indicators.prevRsi14_2 !== null) {
                    isRsiRising = indicators.rsi14 > indicators.prevRsi14 && indicators.prevRsi14 <= indicators.prevRsi14_2;
                }

                // Final Signal
                // Strict v1: Stretch + RSI < 30 + Flat EMA50 + Rising RSI
                // We will return all flags so UI can show partial matches if needed, but 'signal' is the strict entry.
                const signal = isStretchValid && isRsiOversold && isEma50Flat && isRsiRising;

                // Targets
                const target = indicators.ema20;
                const stopLoss = indicators.recentLow && indicators.atr14 ? indicators.recentLow - (1.0 * indicators.atr14) : null;

                return {
                    symbol: item.symbol,
                    price: latestPrice,
                    indicators,
                    analysis: {
                        stretch,
                        isStretchValid,
                        isRsiOversold,
                        isEma50Flat,
                        isRsiRising,
                        signal,
                        target,
                        stopLoss
                    },
                    error: null
                };

            } catch (err: unknown) {
                console.error(`Error analyzing ${item.symbol}:`, err);
                return {
                    symbol: item.symbol,
                    error: 'Failed to fetch/analyze data',
                    price: 0,
                    indicators: {},
                    analysis: {}
                };
            }
        }));

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Strategy API Error:', error);
        return NextResponse.json({ error: 'Strategy calculation failed' }, { status: 500 });
    }
}
