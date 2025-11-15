'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, LineStyle, Time } from 'lightweight-charts';
import { TimeRange, OHLCData } from '../hooks/usePriceHistory';
import { Button } from './ui/Button';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateSupportResistance,
  type MACDResult,
  type BollingerBandsResult,
  type SupportResistanceLevel,
} from '../lib/technicalIndicators';

interface PriceHistoryChartProps {
  data: Array<{ date: string; price: number; volume?: number }>;
  ohlcData?: OHLCData[];
  symbol: string;
  range: TimeRange;
  loading?: boolean;
}

export default function PriceHistoryChart({
  data,
  ohlcData = [],
  symbol,
  range,
  loading = false,
}: PriceHistoryChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const rsiChartRef = useRef<any>(null);
  const macdChartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  // Indicator series refs
  const smaSeriesRefs = useRef<Map<number, any>>(new Map());
  const emaSeriesRefs = useRef<Map<number, any>>(new Map());
  const bbSeriesRef = useRef<any>(null);
  const rsiSeriesRef = useRef<any>(null);
  const macdSeriesRef = useRef<any>(null);
  const macdSignalSeriesRef = useRef<any>(null);
  const macdHistogramSeriesRef = useRef<any>(null);
  const srLinesRef = useRef<Map<string, any>>(new Map());

  const [showVolume, setShowVolume] = useState(false);
  
  // Indicator toggles
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSMA100, setShowSMA100] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showEMA12, setShowEMA12] = useState(false);
  const [showEMA26, setShowEMA26] = useState(false);
  const [showEMA50, setShowEMA50] = useState(false);
  const [showBollingerBands, setShowBollingerBands] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(false);

  // Calculate if price is up or down
  const priceDirection = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const first = data[0].price;
    const last = data[data.length - 1].price;
    return last >= first ? 'up' : 'down';
  }, [data]);

  // Extract prices for calculations
  const prices = useMemo(() => data.map(d => d.price), [data]);

  // Calculate indicators
  const sma20 = useMemo(() => showSMA20 ? calculateSMA(prices, 20) : null, [prices, showSMA20]);
  const sma50 = useMemo(() => showSMA50 ? calculateSMA(prices, 50) : null, [prices, showSMA50]);
  const sma100 = useMemo(() => showSMA100 ? calculateSMA(prices, 100) : null, [prices, showSMA100]);
  const sma200 = useMemo(() => showSMA200 ? calculateSMA(prices, 200) : null, [prices, showSMA200]);
  const ema12 = useMemo(() => showEMA12 ? calculateEMA(prices, 12) : null, [prices, showEMA12]);
  const ema26 = useMemo(() => showEMA26 ? calculateEMA(prices, 26) : null, [prices, showEMA26]);
  const ema50 = useMemo(() => showEMA50 ? calculateEMA(prices, 50) : null, [prices, showEMA50]);
  const bollingerBands = useMemo(() => 
    showBollingerBands ? calculateBollingerBands(prices, 20, 2) : null, 
    [prices, showBollingerBands]
  );
  const rsi = useMemo(() => showRSI ? calculateRSI(prices, 14) : null, [prices, showRSI]);
  const macd = useMemo(() => showMACD ? calculateMACD(prices, 12, 26, 9) : null, [prices, showMACD]);
  const supportResistance = useMemo(() => 
    showSupportResistance && ohlcData.length > 0 
      ? calculateSupportResistance(ohlcData, 5, 2, 1.0) 
      : [], 
    [ohlcData, showSupportResistance]
  );

  // Transform data for lightweight-charts
  const chartData = useMemo(() => {
    return data.map((item) => ({
      time: (new Date(item.date).getTime() / 1000) as Time,
      value: item.price,
    })).sort((a, b) => (a.time as number) - (b.time as number));
  }, [data]);

  // Transform indicator data
  const transformIndicatorData = (values: (number | null)[], dates: string[]) => {
    return values.map((val, idx) => ({
      time: (new Date(dates[idx]).getTime() / 1000) as Time,
      value: val,
    })).filter(item => item.value !== null && !isNaN(item.value as number));
  };

  // Transform volume data
  const volumeData = useMemo(() => {
    if (!data.some((item) => item.volume !== undefined)) return [];
    return data
      .map((item) => ({
        time: (new Date(item.date).getTime() / 1000) as Time,
        value: item.volume || 0,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
  }, [data]);

  // Detect dark mode
  const isDarkMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  // Initialize main chart
  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const lineColor = priceDirection === 'up' 
      ? '#10b981' // emerald-500
      : priceDirection === 'down'
      ? '#ef4444' // rose-500
      : '#6366f1'; // indigo-500

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDarkMode ? '#94a3b8' : '#64748b',
        fontSize: 12,
      },
      grid: {
        vertLines: { 
          color: isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.3)', 
          style: LineStyle.Solid,
        },
        horzLines: { 
          color: isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.3)',
          style: LineStyle.Solid,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 480,
      timeScale: {
        timeVisible: false,
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        tickMarkFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: data.length > 365 ? 'numeric' : undefined,
          });
        },
      },
      rightPriceScale: {
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      },
    });

    chartRef.current = chart;

    // Add main price series
    const series = chart.addAreaSeries({
      lineColor: lineColor,
      topColor: `${lineColor}4D`,
      bottomColor: `${lineColor}00`,
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => `₨${price.toFixed(2)}`,
      },
    });

    seriesRef.current = series;
    series.setData(chartData);

    // Add volume series
    if (volumeData.length > 0) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#6366f1',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volumeSeriesRef.current = volumeSeries;
      if (showVolume) {
        volumeSeries.setData(volumeData);
      }
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData, priceDirection, isDarkMode, data.length]);

  // Update volume visibility
  useEffect(() => {
    if (volumeSeriesRef.current && volumeData.length > 0) {
      if (showVolume) {
        volumeSeriesRef.current.setData(volumeData);
      } else {
        volumeSeriesRef.current.setData([]);
      }
    }
  }, [showVolume, volumeData]);

  // Add/remove SMA lines
  useEffect(() => {
    if (!chartRef.current) return;

    const smaConfigs = [
      { period: 20, values: sma20, color: '#3b82f6', show: showSMA20 },
      { period: 50, values: sma50, color: '#60a5fa', show: showSMA50 },
      { period: 100, values: sma100, color: '#93c5fd', show: showSMA100 },
      { period: 200, values: sma200, color: '#cbd5e1', show: showSMA200 },
    ];

    smaConfigs.forEach(({ period, values, color, show }) => {
      if (show && values) {
        if (!smaSeriesRefs.current.has(period)) {
          const series = chartRef.current.addLineSeries({
            color: color,
            lineWidth: 1,
            title: `SMA ${period}`,
            priceFormat: { type: 'custom', formatter: (p: number) => `₨${p.toFixed(2)}` },
          });
          smaSeriesRefs.current.set(period, series);
          const indicatorData = transformIndicatorData(values, data.map(d => d.date));
          series.setData(indicatorData);
        }
      } else {
        const series = smaSeriesRefs.current.get(period);
        if (series) {
          chartRef.current.removeSeries(series);
          smaSeriesRefs.current.delete(period);
        }
      }
    });
  }, [sma20, sma50, sma100, sma200, showSMA20, showSMA50, showSMA100, showSMA200, data]);

  // Add/remove EMA lines
  useEffect(() => {
    if (!chartRef.current) return;

    const emaConfigs = [
      { period: 12, values: ema12, color: '#f59e0b', show: showEMA12 },
      { period: 26, values: ema26, color: '#f97316', show: showEMA26 },
      { period: 50, values: ema50, color: '#fb923c', show: showEMA50 },
    ];

    emaConfigs.forEach(({ period, values, color, show }) => {
      if (show && values) {
        if (!emaSeriesRefs.current.has(period)) {
          const series = chartRef.current.addLineSeries({
            color: color,
            lineWidth: 1,
            title: `EMA ${period}`,
            priceFormat: { type: 'custom', formatter: (p: number) => `₨${p.toFixed(2)}` },
          });
          emaSeriesRefs.current.set(period, series);
          const indicatorData = transformIndicatorData(values, data.map(d => d.date));
          series.setData(indicatorData);
        }
      } else {
        const series = emaSeriesRefs.current.get(period);
        if (series) {
          chartRef.current.removeSeries(series);
          emaSeriesRefs.current.delete(period);
        }
      }
    });
  }, [ema12, ema26, ema50, showEMA12, showEMA26, showEMA50, data]);

  // Add/remove Bollinger Bands
  useEffect(() => {
    if (!chartRef.current) return;

    if (showBollingerBands && bollingerBands) {
      if (!bbSeriesRef.current) {
        // Upper band
        const upperSeries = chartRef.current.addLineSeries({
          color: '#60a5fa',
          lineWidth: 1,
          title: 'BB Upper',
          priceFormat: { type: 'custom', formatter: (p: number) => `₨${p.toFixed(2)}` },
        });
        const upperData = transformIndicatorData(bollingerBands.upper, data.map(d => d.date));
        upperSeries.setData(upperData);

        // Lower band
        const lowerSeries = chartRef.current.addLineSeries({
          color: '#60a5fa',
          lineWidth: 1,
          title: 'BB Lower',
          priceFormat: { type: 'custom', formatter: (p: number) => `₨${p.toFixed(2)}` },
        });
        const lowerData = transformIndicatorData(bollingerBands.lower, data.map(d => d.date));
        lowerSeries.setData(lowerData);

        // Middle band (SMA)
        const middleSeries = chartRef.current.addLineSeries({
          color: '#93c5fd',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: 'BB Middle',
          priceFormat: { type: 'custom', formatter: (p: number) => `₨${p.toFixed(2)}` },
        });
        const middleData = transformIndicatorData(bollingerBands.middle, data.map(d => d.date));
        middleSeries.setData(middleData);

        bbSeriesRef.current = { upper: upperSeries, middle: middleSeries, lower: lowerSeries };
      }
    } else {
      if (bbSeriesRef.current) {
        chartRef.current.removeSeries(bbSeriesRef.current.upper);
        chartRef.current.removeSeries(bbSeriesRef.current.middle);
        chartRef.current.removeSeries(bbSeriesRef.current.lower);
        bbSeriesRef.current = null;
      }
    }
  }, [showBollingerBands, bollingerBands, data]);

  // Add/remove Support/Resistance lines
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    // Remove existing lines
    srLinesRef.current.forEach((line) => {
      seriesRef.current.removePriceLine(line);
    });
    srLinesRef.current.clear();

    if (showSupportResistance && supportResistance.length > 0) {
      supportResistance.forEach((level, idx) => {
        const color = level.type === 'support' ? '#10b981' : '#ef4444';
        const lineWidth = Math.min(Math.max(level.strength / 2, 1), 3); // Thicker for stronger levels
        
        const priceLine = {
          price: level.price,
          color: color,
          lineWidth: lineWidth,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${level.type === 'support' ? 'Support' : 'Resistance'} ${level.price.toFixed(2)}`,
        };

        const line = seriesRef.current.createPriceLine(priceLine);
        srLinesRef.current.set(`${level.type}-${idx}`, line);
      });
    }
  }, [showSupportResistance, supportResistance]);

  // Initialize RSI chart
  useEffect(() => {
    if (!rsiContainerRef.current || !showRSI || !rsi) return;

    const chart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDarkMode ? '#94a3b8' : '#64748b',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.3)' },
        horzLines: { color: isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.3)' },
      },
      width: rsiContainerRef.current.clientWidth,
      height: 200,
      timeScale: {
        visible: false, // Hide time scale for sub-charts
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      },
      rightPriceScale: {
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });

    rsiChartRef.current = chart;

    // Sync time scale with main chart
    if (chartRef.current) {
      chart.timeScale().subscribeVisibleTimeRangeChange((timeRange: any) => {
        if (timeRange) {
          chartRef.current?.timeScale().setVisibleRange(timeRange);
        }
      });
    }

    const rsiData = transformIndicatorData(rsi, data.map(d => d.date));
    const rsiSeries = chart.addLineSeries({
      color: '#6366f1',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(2) },
    });
    rsiSeries.setData(rsiData);

    // Add overbought/oversold lines
    rsiSeries.createPriceLine({
      price: 70,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Overbought (70)',
    });
    rsiSeries.createPriceLine({
      price: 30,
      color: '#10b981',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Oversold (30)',
    });

    rsiSeriesRef.current = rsiSeries;

    const handleResize = () => {
      if (rsiContainerRef.current) {
        chart.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [showRSI, rsi, data, isDarkMode]);

  // Initialize MACD chart
  useEffect(() => {
    if (!macdContainerRef.current || !showMACD || !macd) return;

    const chart = createChart(macdContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDarkMode ? '#94a3b8' : '#64748b',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.3)' },
        horzLines: { color: isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.3)' },
      },
      width: macdContainerRef.current.clientWidth,
      height: 200,
      timeScale: {
        visible: false,
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      },
      rightPriceScale: {
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });

    macdChartRef.current = chart;

    // Sync time scale
    if (chartRef.current) {
      chart.timeScale().subscribeVisibleTimeRangeChange((timeRange: any) => {
        if (timeRange) {
          chartRef.current?.timeScale().setVisibleRange(timeRange);
        }
      });
    }

    // MACD line
    const macdData = transformIndicatorData(macd.macd, data.map(d => d.date));
    const macdSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: 'MACD',
      priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(4) },
    });
    macdSeries.setData(macdData);
    macdSeriesRef.current = macdSeries;

    // Signal line
    const signalData = transformIndicatorData(macd.signal, data.map(d => d.date));
    const signalSeries = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 1,
      title: 'Signal',
      priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(4) },
    });
    signalSeries.setData(signalData);
    macdSignalSeriesRef.current = signalSeries;

    // Histogram
    const histogramData = transformIndicatorData(macd.histogram, data.map(d => d.date)).map(item => ({
      ...item,
      color: (item.value as number) >= 0 ? '#10b981' : '#ef4444',
    }));
    const histogramSeries = chart.addHistogramSeries({
      priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(4) },
    });
    histogramSeries.setData(histogramData);
    macdHistogramSeriesRef.current = histogramSeries;

    // Zero line
    macdSeries.createPriceLine({
      price: 0,
      color: isDarkMode ? '#64748b' : '#94a3b8',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
    });

    const handleResize = () => {
      if (macdContainerRef.current) {
        chart.applyOptions({ width: macdContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [showMACD, macd, data, isDarkMode]);

  // Sync time scales when main chart changes
  useEffect(() => {
    if (!chartRef.current) return;

    const syncTimeScales = (timeRange: any) => {
      if (rsiChartRef.current && showRSI) {
        rsiChartRef.current.timeScale().setVisibleRange(timeRange);
      }
      if (macdChartRef.current && showMACD) {
        macdChartRef.current.timeScale().setVisibleRange(timeRange);
      }
    };

    chartRef.current.timeScale().subscribeVisibleTimeRangeChange(syncTimeScales);
  }, [showRSI, showMACD]);

  if (loading) {
    return (
      <div className="w-full h-[480px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3 dark:border-indigo-900 dark:border-t-indigo-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-[480px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg">
        <div className="text-center">
          <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-600 dark:text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  const hasVolumeData = volumeData.length > 0;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Chart Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Indicators:</span>
            
            {/* Moving Averages */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400">SMA:</span>
              {[20, 50, 100, 200].map(period => (
                <label key={period} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={period === 20 ? showSMA20 : period === 50 ? showSMA50 : period === 100 ? showSMA100 : showSMA200}
                    onChange={(e) => {
                      if (period === 20) setShowSMA20(e.target.checked);
                      else if (period === 50) setShowSMA50(e.target.checked);
                      else if (period === 100) setShowSMA100(e.target.checked);
                      else setShowSMA200(e.target.checked);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-600 dark:text-slate-400">{period}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400">EMA:</span>
              {[12, 26, 50].map(period => (
                <label key={period} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={period === 12 ? showEMA12 : period === 26 ? showEMA26 : showEMA50}
                    onChange={(e) => {
                      if (period === 12) setShowEMA12(e.target.checked);
                      else if (period === 26) setShowEMA26(e.target.checked);
                      else setShowEMA50(e.target.checked);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-600 dark:text-slate-400">{period}</span>
                </label>
              ))}
            </div>

            {/* Other Indicators */}
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showBollingerBands}
                onChange={(e) => setShowBollingerBands(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-600 dark:text-slate-400">BB</span>
            </label>

            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showRSI}
                onChange={(e) => setShowRSI(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-600 dark:text-slate-400">RSI</span>
            </label>

            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showMACD}
                onChange={(e) => setShowMACD(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-600 dark:text-slate-400">MACD</span>
            </label>

            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showSupportResistance}
                onChange={(e) => setShowSupportResistance(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-600 dark:text-slate-400">S/R</span>
            </label>
          </div>

          {hasVolumeData && (
            <Button
              variant={showVolume ? 'primary' : 'secondary'}
              onClick={() => setShowVolume(!showVolume)}
              className="text-xs px-3 py-1.5"
            >
              {showVolume ? 'Hide Volume' : 'Show Volume'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Chart */}
      <div className="p-4">
        <div ref={chartContainerRef} className="w-full h-[480px]" />
      </div>

      {/* RSI Panel */}
      {showRSI && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">RSI (14)</h4>
          </div>
          <div ref={rsiContainerRef} className="w-full h-[200px]" />
        </div>
      )}

      {/* MACD Panel */}
      {showMACD && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">MACD (12, 26, 9)</h4>
          </div>
          <div ref={macdContainerRef} className="w-full h-[200px]" />
        </div>
      )}
    </div>
  );
}
