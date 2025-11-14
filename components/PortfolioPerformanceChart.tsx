'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/Card';
import ChartClient from './ChartClient';

interface PortfolioDataPoint {
  time: number; // Unix timestamp in seconds
  value: number; // Portfolio value
}

interface PortfolioPerformanceChartProps {
  data?: PortfolioDataPoint[];
  currentValue: number;
  isLoading?: boolean;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export default function PortfolioPerformanceChart({ 
  data, 
  currentValue,
  isLoading = false 
}: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  // Generate mock data if no data provided (for demonstration)
  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      // Filter data based on time range
      const now = Math.floor(Date.now() / 1000);
      let cutoffTime = 0;
      
      switch (timeRange) {
        case '1D':
          cutoffTime = now - 86400;
          break;
        case '1W':
          cutoffTime = now - 604800;
          break;
        case '1M':
          cutoffTime = now - 2592000;
          break;
        case '3M':
          cutoffTime = now - 7776000;
          break;
        case '6M':
          cutoffTime = now - 15552000;
          break;
        case '1Y':
          cutoffTime = now - 31536000;
          break;
        case 'ALL':
          cutoffTime = 0;
          break;
      }
      
      return data
        .filter(point => point.time >= cutoffTime)
        .map(point => ({
          time: point.time,
          value: point.value,
        }));
    }
    
    // Generate placeholder data if no historical data
    const placeholderData: PortfolioDataPoint[] = [];
    const now = Math.floor(Date.now() / 1000);
    const days = timeRange === '1D' ? 1 : timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : timeRange === '6M' ? 180 : timeRange === '1Y' ? 365 : 365;
    
    for (let i = days; i >= 0; i--) {
      const time = now - (i * 86400);
      // Simulate some variation around current value
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      placeholderData.push({
        time,
        value: currentValue * (1 + variation),
      });
    }
    
    return placeholderData.map(point => ({
      time: point.time,
      value: point.value,
    }));
  }, [data, timeRange, currentValue]);

  const timeRanges: { label: string; value: TimeRange }[] = [
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: '1Y', value: '1Y' },
    { label: 'ALL', value: 'ALL' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Portfolio Performance
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Value over time
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  timeRange === range.value
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-80">
          <ChartClient data={chartData} />
        </div>
        {!data && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
            Note: Historical portfolio data is not available. Showing simulated data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

