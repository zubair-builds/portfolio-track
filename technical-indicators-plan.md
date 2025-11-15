# Add Technical Indicators with Support/Resistance to Symbol Detail Page

## Overview

Add technical indicators to the price chart on symbol detail pages. Indicators will be calculated client-side from existing kline data (1d timeframe, 5 years). Display moving averages, Bollinger Bands, and Support/Resistance levels as overlays on the price chart, and RSI/MACD in separate panels below.

## Implementation Plan

### 1. Create Technical Indicators Utility Library

**File**: `lib/technicalIndicators.ts`

- Implement calculation functions for:
- **SMA (Simple Moving Average)**: Multiple periods (20, 50, 100, 200)
- **EMA (Exponential Moving Average)**: Multiple periods (12, 26, 50)
- **RSI (Relative Strength Index)**: 14-period default
- **MACD (Moving Average Convergence Divergence)**: 12, 26, 9 periods
- **Bollinger Bands**: 20-period SMA with 2 standard deviations
- **Support & Resistance Levels**: Detect pivot points (swing highs/lows) using local minima/maxima algorithm
- Functions should accept array of price data and return arrays of calculated values
- Handle edge cases (insufficient data, null values)
- Support/Resistance algorithm:
- Identify local minima (support) and local maxima (resistance) using rolling window
- Filter by significance (number of price touches, volume, time duration)
- Cluster nearby levels to avoid duplicates (within price tolerance)
- Return horizontal lines with price levels and strength scores
- Limit to top 3-5 strongest levels to avoid clutter

### 2. Update PriceHistoryChart Component

**File**: `components/PriceHistoryChart.tsx`

- Add state for toggling each indicator
- Add indicator calculation using the utility library
- Add overlay series for:
- SMA lines (20, 50, 100, 200) - different colors
- EMA lines (12, 26, 50) - different colors
- Bollinger Bands (upper, middle, lower) - shaded area
- Support & Resistance levels - horizontal lines with price labels
- Add separate panels below main chart for:
- RSI panel (0-100 scale)
- MACD panel (histogram + signal line)
- Add toggle controls UI for each indicator
- Use lightweight-charts API:
- `addLineSeries()` for moving averages
- `addAreaSeries()` for Bollinger Bands shading
- `addHistogramSeries()` for MACD histogram
- `addLineSeries()` for MACD signal line
- `createPriceScale()` for separate RSI/MACD panels
- `createPriceLine()` or custom horizontal lines for Support/Resistance
- Price labels on right side for S/R levels

### 3. Add Indicator Controls UI

**File**: `components/PriceHistoryChart.tsx` (continued)

- Create control panel with checkboxes/toggles for:
- SMA: 20, 50, 100, 200
- EMA: 12, 26, 50
- Bollinger Bands
- RSI
- MACD
- Support & Resistance
- Group indicators logically (Moving Averages, Oscillators, Levels)
- Show/hide panels based on toggle state
- Style consistently with existing UI
- Add option to configure S/R sensitivity (lookback period, minimum touches)

### 4. Update Chart Data Structure

**File**: `components/PriceHistoryChart.tsx`

- Ensure kline data includes OHLC (Open, High, Low, Close) for accurate calculations
- Check if current data structure from `usePriceHistory` includes OHLC or only closing prices
- If only closing prices, may need to fetch full kline data for indicators that need High/Low
- Support/Resistance needs High/Low prices for accurate pivot detection

### 5. Performance Optimization

- Memoize indicator calculations using `useMemo`
- Only recalculate when data or selected indicators change
- Consider Web Workers for very large datasets (if needed)
- Lazy load indicator calculations (calculate on demand when toggled)
- Cache S/R levels when time range changes (recalculate only if needed)

### 6. Styling and UX

- Use consistent color scheme:
- SMA: Different shades of blue/gray
- EMA: Different shades of orange/yellow
- Bollinger Bands: Light blue shaded area with border
- RSI: Green (overbought >70), Red (oversold <30), Gray (neutral)
- MACD: Blue (positive), Red (negative), Orange (signal line)
- Support: Green horizontal lines with labels
- Resistance: Red horizontal lines with labels
- Add legend/key for indicator colors
- Ensure dark mode compatibility
- Make panels resizable or fixed height
- Display S/R levels with price labels on the right side of chart
- Show strength indicator for S/R levels (based on number of touches) - thicker lines for stronger levels

## Files to Modify

1. `lib/technicalIndicators.ts` (new file)
2. `components/PriceHistoryChart.tsx` (major update)
3. `hooks/usePriceHistory.ts` (may need to ensure OHLC data is available)

## Files to Check

1. `app/api/klines/[symbol]/route.ts` - Verify OHLC data structure
2. `lib/klinesStore.ts` - Check if full kline data (OHLCV) is available

## Technical Considerations

- lightweight-charts supports multiple series and price scales
- Need to ensure data alignment (same time indices)
- Handle cases where insufficient data for certain indicators
- Show loading states during calculation
- Error handling for calculation failures
- Support/Resistance detection:
- Use pivot point algorithm (local minima/maxima with lookback window, e.g., 5-10 periods)
- Consider volume-weighted levels for stronger S/R (if volume data available)
- Filter out weak levels (only 1-2 touches)
- Limit number of displayed levels to avoid clutter (top 3-5 strongest)
- Update S/R levels when time range changes
- Use price tolerance (e.g., 0.5-1% of price) for clustering nearby levels