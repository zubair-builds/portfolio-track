import { EMA, RSI, ATR, ADX } from 'technicalindicators';

export interface Candle {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface StrategyIndicators {
    ema20: number | null;
    ema50: number | null;
    rsi14: number | null;
    prevRsi14: number | null;
    prevRsi14_2: number | null; // t-2
    atr14: number | null;
    adx14: number | null;
    ema50Slope: number | null; // Normalized slope
    recentLow: number | null; // Lowest low of last 5 days
}

/**
 * Calculate technical indicators for the strategy
 */
export function calculateIndicators(candles: Candle[]): StrategyIndicators {
    if (candles.length < 60) {
        return {
            ema20: null,
            ema50: null,
            rsi14: null,
            prevRsi14: null,
            prevRsi14_2: null,
            atr14: null,
            adx14: null,
            ema50Slope: null,
            recentLow: null
        };
    }

    // Arrays for calculations
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // EMA
    const ema20Values = EMA.calculate({ period: 20, values: closes });
    const ema50Values = EMA.calculate({ period: 50, values: closes });

    // RSI
    const rsiValues = RSI.calculate({ period: 14, values: closes });

    // ATR
    const atrInput = { high: highs, low: lows, close: closes, period: 14 };
    const atrValues = ATR.calculate(atrInput);

    // ADX
    const adxValues = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });

    // Current values (last calculated)
    const currentEma20 = ema20Values[ema20Values.length - 1];
    const currentEma50 = ema50Values[ema50Values.length - 1];
    const prevEma50_5 = ema50Values[ema50Values.length - 6]; // t-5

    const currentRsi = rsiValues[rsiValues.length - 1];
    const prevRsi = rsiValues[rsiValues.length - 2];
    const prevRsi_2 = rsiValues[rsiValues.length - 3];

    const currentAtr = atrValues[atrValues.length - 1];
    const currentAdx = adxValues[adxValues.length - 1]?.adx; // ADX returns object {adx, pdi, mdi}

    // Slope Calculation: abs(EMA50[t] - EMA50[t-5]) < 0.5 * ATR(14)
    let ema50Slope = null;
    if (currentEma50 && prevEma50_5 && currentAtr) {
        ema50Slope = Math.abs(currentEma50 - prevEma50_5);
    }

    // Recent Low: Lowest low of last 5 days
    // Candles array is usually oldest to newest. We want the last 5 candles.
    const last5Candles = candles.slice(-5);
    const recentLow = Math.min(...last5Candles.map(c => c.low));

    return {
        ema20: currentEma20 || null,
        ema50: currentEma50 || null,
        rsi14: currentRsi || null,
        prevRsi14: prevRsi || null,
        prevRsi14_2: prevRsi_2 || null,
        atr14: currentAtr || null,
        adx14: currentAdx || null,
        ema50Slope: ema50Slope,
        recentLow: recentLow
    };
}
