'use client';

import { Stock } from '../lib/portfolioData';
import { Card, CardContent } from './ui/Card';

interface PortfolioAllocationProps {
  stocks: Stock[];
}

export default function PortfolioAllocation({ stocks }: PortfolioAllocationProps) {
  // Calculate allocations based on current value
  const stocksWithAllocation = stocks.map((stock) => {
    const currentValue = stock.shares * stock.currentPrice;
    return {
      ...stock,
      currentValue,
    };
  });

  const totalValue = stocksWithAllocation.reduce((sum, stock) => sum + stock.currentValue, 0);

  if (!stocks.length || !Number.isFinite(totalValue) || totalValue <= 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-600 dark:text-slate-300">
            <svg className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No allocation data</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Add holdings to view your portfolio distribution.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allocations = stocksWithAllocation
    .map((stock) => ({
      symbol: stock.symbol,
      value: stock.currentValue,
      percentage: (stock.currentValue / totalValue) * 100,
    }))
    .filter((allocation) => Number.isFinite(allocation.percentage) && allocation.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);

  // Get top 10 and group rest as "Others"
  const top10 = allocations.slice(0, 10);
  const others = allocations.slice(10);
  const othersPercentage = others.reduce((sum, item) => sum + item.percentage, 0);
  const othersValue = others.reduce((sum, item) => sum + item.value, 0);

  const displayAllocations = [...top10];
  if (others.length > 0 && othersPercentage > 0) {
    displayAllocations.push({
      symbol: `Others (${others.length})`,
      value: othersValue,
      percentage: othersPercentage,
    });
  }

  const colorPalette = [
    '#6366f1',
    '#3b82f6',
    '#06b6d4',
    '#14b8a6',
    '#10b981',
    '#22c55e',
    '#84cc16',
    '#eab308',
    '#f59e0b',
    '#f97316',
    '#94a3b8',
  ];

  const allocationsWithColor = displayAllocations.map((allocation, index) => ({
    ...allocation,
    color: colorPalette[index % colorPalette.length],
  }));

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return `M ${x} ${y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  const slices = [] as {
    path: string;
    color: string;
    allocation: typeof allocationsWithColor[number];
    labelPosition: { x: number; y: number } | null;
    showLabel: boolean;
  }[];

  let cumulativeAngle = 0;
  allocationsWithColor.forEach((allocation, index) => {
    if (allocation.percentage <= 0) return;
    const sliceAngle = (allocation.percentage / 100) * 360;
    let startAngle = cumulativeAngle;
    let endAngle = cumulativeAngle + sliceAngle;
    if (index === allocationsWithColor.length - 1) {
      endAngle = 360;
    }
    cumulativeAngle = endAngle;

    const path = describeArc(100, 100, 90, startAngle, endAngle);
    const labelRadius = 65;
    const midAngle = startAngle + (endAngle - startAngle) / 2;
    const labelPosition = polarToCartesian(100, 100, labelRadius, midAngle);
    const showLabel = allocation.percentage >= 4;

    slices.push({
      path,
      color: allocation.color,
      allocation,
      labelPosition: showLabel ? labelPosition : null,
      showLabel,
    });
  });

  const totalValueLabel = totalValue.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <div className="flex flex-col items-center justify-center gap-5">
              <div className="relative h-80 w-80">
                <svg viewBox="0 0 200 200" className="h-full w-full">
                  <circle cx="100" cy="100" r="92" className="fill-white dark:fill-slate-950" />
                  {slices.map((slice) => (
                    <path
                      key={slice.allocation.symbol}
                      d={slice.path}
                      fill={slice.color}
                      stroke="#0f172a"
                      strokeWidth={0.5}
                      className="dark:stroke-slate-900"
                    >
                      <title>{`${slice.allocation.symbol}: ${slice.allocation.percentage.toFixed(2)}%`}</title>
                    </path>
                  ))}
                  {slices.map((slice) => (
                    slice.showLabel && slice.labelPosition ? (
                      <text
                        key={`${slice.allocation.symbol}-label`}
                        x={slice.labelPosition.x}
                        y={slice.labelPosition.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fill: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 600,
                          paintOrder: 'stroke',
                          stroke: 'rgba(15, 23, 42, 0.5)',
                          strokeWidth: 1.5,
                        }}
                      >
                        {slice.allocation.symbol}
                      </text>
                    ) : null
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Portfolio Value
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    ₨{totalValueLabel}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {allocationsWithColor.length} segments
                  </p>
                </div>
              </div>
              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                Hover a segment to see allocation details
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center h-8 rounded-lg overflow-hidden">
                  {allocationsWithColor.map((allocation) => (
                    <div
                      key={allocation.symbol}
                      className="h-full transition-all duration-300 hover:opacity-80"
                      style={{
                        width: `${allocation.percentage}%`,
                        backgroundColor: allocation.color,
                      }}
                      title={`${allocation.symbol}: ${allocation.percentage.toFixed(2)}%`}
                    >
                      {allocation.percentage > 5 && (
                        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                          {allocation.percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stacked bar showing proportional weights (top 10 holdings, others grouped)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allocationsWithColor.map((allocation) => (
                  <div
                    key={allocation.symbol}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: allocation.color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {allocation.symbol}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          ₨{allocation.value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <p className="ml-4 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {allocation.percentage.toFixed(2)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
                Largest Holding
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {allocationsWithColor[0]?.symbol}
              </p>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {allocationsWithColor[0]?.percentage.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
                Smallest Holding
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {allocationsWithColor[allocationsWithColor.length - 1]?.symbol}
              </p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {allocationsWithColor[allocationsWithColor.length - 1]?.percentage.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
                Top 3 Holdings
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {allocationsWithColor
                  .slice(0, 3)
                  .reduce((sum, allocation) => sum + allocation.percentage, 0)
                  .toFixed(2)}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">of portfolio</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
                Diversification
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{stocks.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">positions</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

