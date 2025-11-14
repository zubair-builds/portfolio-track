'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, LineStyle, Time } from 'lightweight-charts';
import { TimeRange } from '../hooks/usePriceHistory';
import { Button } from './ui/Button';

interface PriceHistoryChartProps {
  data: Array<{ date: string; price: number; volume?: number }>;
  symbol: string;
  range: TimeRange;
  loading?: boolean;
}

export default function PriceHistoryChart({
  data,
  symbol,
  range,
  loading = false,
}: PriceHistoryChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [showVolume, setShowVolume] = useState(false);

  // Calculate if price is up or down
  const priceDirection = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const first = data[0].price;
    const last = data[data.length - 1].price;
    return last >= first ? 'up' : 'down';
  }, [data]);

  // Transform data for lightweight-charts
  const chartData = useMemo(() => {
    return data.map((item) => ({
      time: (new Date(item.date).getTime() / 1000) as Time, // Convert to Unix timestamp in seconds
      value: item.price,
    })).sort((a, b) => (a.time as number) - (b.time as number));
  }, [data]);

  // Transform volume data for lightweight-charts
  const volumeData = useMemo(() => {
    if (!data.some((item) => item.volume !== undefined)) return [];
    return data
      .map((item) => ({
        time: (new Date(item.date).getTime() / 1000) as Time,
        value: item.volume || 0,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
  }, [data]);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Determine chart colors based on price direction
    const lineColor = priceDirection === 'up' 
      ? '#10b981' // emerald-500
      : priceDirection === 'down'
      ? '#ef4444' // rose-500
      : '#6366f1'; // indigo-500

    // Detect dark mode
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDarkMode ? '#94a3b8' : '#64748b', // slate-400 for dark, slate-500 for light
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
      height: 480, // Increased height for better visibility
      timeScale: {
        timeVisible: false, // Hide time part for cleaner display
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        tickMarkFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: data.length > 365 ? 'numeric' : undefined, // Show year if more than 1 year of data
          });
        },
      },
      rightPriceScale: {
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      },
    });

    chartRef.current = chart;

    // Add area series
    const series = chart.addAreaSeries({
      lineColor: lineColor,
      topColor: `${lineColor}4D`, // 30% opacity
      bottomColor: `${lineColor}00`, // 0% opacity
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => `₨${price.toFixed(2)}`,
      },
    });

    seriesRef.current = series;

    // Set data
    series.setData(chartData);

    // Add volume series if volume data is available
    if (volumeData.length > 0) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#6366f1',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });
      volumeSeriesRef.current = volumeSeries;
      volumeSeries.setData(volumeData);
    }

    // Fit content
    chart.timeScale().fitContent();

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
  }, [chartData, volumeData, priceDirection, showVolume]);

  // Toggle volume visibility
  useEffect(() => {
    if (volumeSeriesRef.current && volumeData.length > 0) {
      if (showVolume) {
        volumeSeriesRef.current.setData(volumeData);
      } else {
        volumeSeriesRef.current.setData([]);
      }
    }
  }, [showVolume, volumeData]);

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
      {hasVolumeData && (
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Chart Options:</span>
            <Button
              variant={showVolume ? 'primary' : 'secondary'}
              onClick={() => setShowVolume(!showVolume)}
              className="text-xs px-3 py-1.5"
            >
              {showVolume ? 'Hide Volume' : 'Show Volume'}
            </Button>
          </div>
        </div>
      )}
      {/* Chart Container */}
      <div className="p-4">
        <div ref={chartContainerRef} className="w-full h-[480px]" />
      </div>
    </div>
  );
}

