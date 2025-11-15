/**
 * Technical Indicators Library
 * Client-side calculations for technical analysis indicators
 */

export interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PriceData {
  date: string;
  price: number;
  volume?: number;
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  if (prices.length < period) {
    return new Array(prices.length).fill(null);
  }

  const sma: (number | null)[] = new Array(period - 1).fill(null);
  
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }

  return sma;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  if (prices.length < period) {
    return new Array(prices.length).fill(null);
  }

  const ema: (number | null)[] = new Array(period - 1).fill(null);
  const multiplier = 2 / (period + 1);

  // Start with SMA for the first EMA value
  const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(firstSMA);

  // Calculate EMA for remaining values
  for (let i = period; i < prices.length; i++) {
    const prevEMA = ema[i - 1]!;
    const currentPrice = prices[i];
    const newEMA = (currentPrice - prevEMA) * multiplier + prevEMA;
    ema.push(newEMA);
  }

  return ema;
}

/**
 * Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  if (prices.length < period + 1) {
    return new Array(prices.length).fill(null);
  }

  const rsi: (number | null)[] = new Array(period).fill(null);
  const changes: number[] = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Calculate initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Calculate first RSI
  if (avgLoss === 0) {
    rsi.push(100);
  } else {
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }

  // Calculate subsequent RSI values using Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macd: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macd.push(fastEMA[i]! - slowEMA[i]!);
    } else {
      macd.push(null);
    }
  }

  // Calculate signal line (EMA of MACD)
  const macdValues = macd.filter((v): v is number => v !== null);
  const signal = calculateEMA(macdValues, signalPeriod);

  // Pad signal array to match macd length
  const paddedSignal: (number | null)[] = [];
  let signalIndex = 0;
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] === null) {
      paddedSignal.push(null);
    } else {
      paddedSignal.push(signal[signalIndex] ?? null);
      signalIndex++;
    }
  }

  // Calculate histogram (MACD - Signal)
  const histogram: (number | null)[] = [];
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] !== null && paddedSignal[i] !== null) {
      histogram.push(macd[i]! - paddedSignal[i]!);
    } else {
      histogram.push(null);
    }
  }

  return {
    macd,
    signal: paddedSignal,
    histogram,
  };
}

/**
 * Bollinger Bands
 */
export interface BollingerBandsResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult {
  const middle = calculateSMA(prices, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      // Calculate standard deviation for the period
      const startIdx = Math.max(0, i - period + 1);
      const periodPrices = prices.slice(startIdx, i + 1);
      const mean = middle[i]!;
      
      const variance = periodPrices.reduce((sum, price) => {
        return sum + Math.pow(price - mean, 2);
      }, 0) / periodPrices.length;
      
      const standardDev = Math.sqrt(variance);
      
      upper.push(mean + (stdDev * standardDev));
      lower.push(mean - (stdDev * standardDev));
    }
  }

  return { upper, middle, lower };
}

/**
 * Support and Resistance Levels
 */
export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // Number of touches
  touches: number[];
}

export function calculateSupportResistance(
  ohlcData: OHLCData[],
  lookbackPeriod: number = 5,
  minTouches: number = 2,
  priceTolerancePercent: number = 1.0
): SupportResistanceLevel[] {
  if (ohlcData.length < lookbackPeriod * 2) {
    return [];
  }

  const levels: SupportResistanceLevel[] = [];
  const highs: Array<{ price: number; index: number }> = [];
  const lows: Array<{ price: number; index: number }> = [];

  // Find local maxima (resistance) and minima (support)
  for (let i = lookbackPeriod; i < ohlcData.length - lookbackPeriod; i++) {
    const currentHigh = ohlcData[i].high;
    const currentLow = ohlcData[i].low;

    // Check if current high is a local maximum
    let isLocalMax = true;
    for (let j = i - lookbackPeriod; j <= i + lookbackPeriod; j++) {
      if (j !== i && ohlcData[j].high >= currentHigh) {
        isLocalMax = false;
        break;
      }
    }

    // Check if current low is a local minimum
    let isLocalMin = true;
    for (let j = i - lookbackPeriod; j <= i + lookbackPeriod; j++) {
      if (j !== i && ohlcData[j].low <= currentLow) {
        isLocalMin = false;
        break;
      }
    }

    if (isLocalMax) {
      highs.push({ price: currentHigh, index: i });
    }
    if (isLocalMin) {
      lows.push({ price: currentLow, index: i });
    }
  }

  // Cluster nearby levels and count touches
  const clusterLevels = (
    points: Array<{ price: number; index: number }>,
    type: 'support' | 'resistance'
  ): SupportResistanceLevel[] => {
    const clustered: SupportResistanceLevel[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < points.length; i++) {
      if (processed.has(i)) continue;

      const cluster: number[] = [i];
      const clusterPrices: number[] = [points[i].price];
      processed.add(i);

      // Find nearby points within tolerance
      for (let j = i + 1; j < points.length; j++) {
        if (processed.has(j)) continue;

        const avgPrice = clusterPrices.reduce((a, b) => a + b, 0) / clusterPrices.length;
        const tolerance = avgPrice * (priceTolerancePercent / 100);
        const priceDiff = Math.abs(points[j].price - avgPrice);

        if (priceDiff <= tolerance) {
          cluster.push(j);
          clusterPrices.push(points[j].price);
          processed.add(j);
        }
      }

      // Calculate average price for cluster
      const avgPrice = clusterPrices.reduce((a, b) => a + b, 0) / clusterPrices.length;

      // Count touches (how many times price came close to this level)
      let touches = 0;
      const touchIndices: number[] = [];
      for (let k = 0; k < ohlcData.length; k++) {
        const tolerance = avgPrice * (priceTolerancePercent / 100);
        const highDiff = Math.abs(ohlcData[k].high - avgPrice);
        const lowDiff = Math.abs(ohlcData[k].low - avgPrice);

        if (highDiff <= tolerance || lowDiff <= tolerance) {
          touches++;
          touchIndices.push(k);
        }
      }

      if (touches >= minTouches) {
        clustered.push({
          price: avgPrice,
          type,
          strength: touches,
          touches: touchIndices,
        });
      }
    }

    return clustered;
  };

  const resistanceLevels = clusterLevels(highs, 'resistance');
  const supportLevels = clusterLevels(lows, 'support');

  // Combine and sort by strength
  const allLevels = [...resistanceLevels, ...supportLevels].sort(
    (a, b) => b.strength - a.strength
  );

  // Return top 5 strongest levels
  return allLevels.slice(0, 5);
}

