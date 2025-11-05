'use client';

import { useState, useMemo, useRef } from 'react';
import { Stock } from '../lib/portfolioData';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { useSymbolMetadata } from '../hooks/useSymbolMetadata';
import {
  enrichStocksWithMetadata,
  calculateSectorAllocations,
  calculateDiversificationMetrics,
  getPerformanceColor,
  StockWithMetadata,
  SectorAllocation as SectorAlloc,
} from '../lib/allocationUtils';
import SectorAllocation from './SectorAllocation';
import DiversificationMetrics from './DiversificationMetrics';

interface PortfolioAllocationProps {
  stocks: Stock[];
}

type ViewMode = 'stock' | 'sector' | 'diversification';
type ChartType = 'pie' | 'performance';

export default function PortfolioAllocation({ stocks }: PortfolioAllocationProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('stock');
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [selectedSector, setSelectedSector] = useState<SectorAlloc | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  const symbols = stocks.map(s => s.symbol);
  const { metadata, loading: metadataLoading } = useSymbolMetadata(symbols);

  const stocksWithMetadata = useMemo(() => {
    return enrichStocksWithMetadata(stocks, metadata);
  }, [stocks, metadata]);

  const totalValue = useMemo(() => {
    return stocksWithMetadata.reduce((sum, stock) => sum + stock.currentValue, 0);
  }, [stocksWithMetadata]);

  const colorPalette = [
    '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981',
    '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#94a3b8',
  ];

  const allocations = useMemo(() => {
    return stocksWithMetadata
      .map((stock) => ({
        ...stock,
        percentage: stock.allocation,
      }))
      .filter((allocation) => Number.isFinite(allocation.percentage) && allocation.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage);
  }, [stocksWithMetadata]);

  const sectorAllocations = useMemo(() => {
    return calculateSectorAllocations(stocksWithMetadata, colorPalette);
  }, [stocksWithMetadata]);

  const diversificationMetrics = useMemo(() => {
    return calculateDiversificationMetrics(allocations, sectorAllocations);
  }, [allocations, sectorAllocations]);

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

  // Prepare display allocations (top 10 + others)
  const top10 = allocations.slice(0, 10);
  const others = allocations.slice(10);
  const othersPercentage = others.reduce((sum, item) => sum + item.percentage, 0);
  const othersValue = others.reduce((sum, item) => sum + item.currentValue, 0);

  const displayAllocations = [...top10];
  if (others.length > 0 && othersPercentage > 0) {
    displayAllocations.push({
      ...others[0], // Use first "other" as base
      symbol: `Others (${others.length})`,
      name: `${others.length} other stocks`,
      sectorName: 'Mixed',
      currentValue: othersValue,
      percentage: othersPercentage,
      gainLoss: others.reduce((sum, s) => sum + s.gainLoss, 0),
      gainLossPercent: 0,
    });
  }

  const allocationsWithColor = displayAllocations.map((allocation, index) => ({
    ...allocation,
    color: chartType === 'performance' 
      ? getPerformanceColor(allocation.gainLossPercent)
      : colorPalette[index % colorPalette.length],
  }));

  // SVG chart generation
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

  // Export chart as PNG
  const handleExportChart = () => {
    if (!chartRef.current) return;

    const svg = chartRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 800;
    canvas.height = 800;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `portfolio-allocation-${new Date().toISOString().split('T')[0]}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Export data as CSV
  const handleExportCSV = () => {
    const headers = ['Symbol', 'Name', 'Sector', 'Value', 'Allocation %', 'Gain/Loss %'];
    const rows = allocations.map(a => [
      a.symbol,
      a.name || '',
      a.sectorName || '',
      a.currentValue.toFixed(2),
      a.percentage.toFixed(2),
      a.gainLossPercent.toFixed(2),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-allocation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render based on view mode
  if (viewMode === 'sector') {
    return (
      <div className="space-y-4">
        {/* View Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setViewMode('stock')}
                  className="text-sm"
                >
                  By Stock
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setViewMode('sector')}
                  className="text-sm"
                >
                  By Sector
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setViewMode('diversification')}
                  className="text-sm"
                >
                  Diversification
                </Button>
              </div>
              <Button
                variant="secondary"
                onClick={handleExportCSV}
                className="text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <SectorAllocation 
          sectors={sectorAllocations} 
          totalValue={totalValue}
          onSectorClick={setSelectedSector}
        />

        {selectedSector && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {selectedSector.sectorName} - Holdings
                  </h4>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedSector(null)}
                    className="text-sm"
                  >
                    Close
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedSector.stocks.map((stock) => {
                    const isPositive = stock.gainLoss >= 0;
                    const perfColor = isPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400';

                    return (
                      <div
                        key={stock.symbol}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {stock.symbol}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {stock.name}
                          </p>
                          <p className={`text-xs font-medium ${perfColor}`}>
                            {isPositive ? '+' : ''}{stock.gainLossPercent.toFixed(2)}%
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {stock.allocation.toFixed(2)}%
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            ₨{stock.currentValue.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (viewMode === 'diversification') {
    return (
      <div className="space-y-4">
        {/* View Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setViewMode('stock')}
                  className="text-sm"
                >
                  By Stock
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setViewMode('sector')}
                  className="text-sm"
                >
                  By Sector
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setViewMode('diversification')}
                  className="text-sm"
                >
                  Diversification
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <DiversificationMetrics metrics={diversificationMetrics} />
      </div>
    );
  }

  // Stock view (default)
  return (
    <div className="space-y-4">
      {/* View Toggle and Chart Type */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={() => setViewMode('stock')}
                className="text-sm"
              >
                By Stock
              </Button>
              <Button
                variant="secondary"
                onClick={() => setViewMode('sector')}
                className="text-sm"
              >
                By Sector
              </Button>
              <Button
                variant="secondary"
                onClick={() => setViewMode('diversification')}
                className="text-sm"
              >
                Diversification
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={chartType === 'pie' ? 'primary' : 'secondary'}
                onClick={() => setChartType('pie')}
                className="text-sm"
              >
                Standard
              </Button>
              <Button
                variant={chartType === 'performance' ? 'primary' : 'secondary'}
                onClick={() => setChartType('performance')}
                className="text-sm"
              >
                Performance
              </Button>
              <Button
                variant="secondary"
                onClick={handleExportChart}
                className="text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                PNG
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Legend for Performance View */}
      {chartType === 'performance' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <span className="text-xs text-slate-600 dark:text-slate-400">Color Scale:</span>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded" style={{ backgroundColor: '#dc2626' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">&lt; -10%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded" style={{ backgroundColor: '#f87171' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">-5% to -2%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded" style={{ backgroundColor: '#94a3b8' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">Neutral</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded" style={{ backgroundColor: '#4ade80' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">+2% to +5%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded" style={{ backgroundColor: '#16a34a' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">&gt; +10%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              {/* Pie Chart */}
              <div className="flex flex-col items-center justify-center gap-5">
                <div className="relative h-80 w-80">
                  <svg ref={chartRef} viewBox="0 0 200 200" className="h-full w-full">
                    <circle cx="100" cy="100" r="92" className="fill-white dark:fill-slate-950" />
                    {slices.map((slice) => (
                      <g key={slice.allocation.symbol}>
                        <path
                          d={slice.path}
                          fill={slice.color}
                          stroke="#0f172a"
                          strokeWidth={0.5}
                          className="dark:stroke-slate-900 transition-opacity duration-200 hover:opacity-80 cursor-pointer"
                        >
                          <title>
                            {`${slice.allocation.symbol} - ${slice.allocation.name}\n` +
                             `Sector: ${slice.allocation.sectorName}\n` +
                             `Allocation: ${slice.allocation.percentage.toFixed(2)}%\n` +
                             `Value: ₨${slice.allocation.currentValue.toLocaleString('en-PK')}\n` +
                             `Performance: ${slice.allocation.gainLossPercent >= 0 ? '+' : ''}${slice.allocation.gainLossPercent.toFixed(2)}%`}
                          </title>
                        </path>
                      </g>
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
                            pointerEvents: 'none',
                          }}
                        >
                          {slice.allocation.symbol}
                        </text>
                      ) : null
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
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
                  Hover a segment to see detailed allocation info
                </div>
              </div>

              {/* Stock List */}
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
                    Stacked bar showing proportional weights
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allocationsWithColor.map((allocation) => {
                    const isPositive = allocation.gainLoss >= 0;
                    const perfColor = isPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400';

                    return (
                      <div
                        key={allocation.symbol}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-3 transition-all hover:shadow-md hover:scale-[1.02] dark:bg-slate-800/50 dark:hover:bg-slate-800"
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
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                              {allocation.name} • {allocation.sectorName}
                            </p>
                            <p className={`text-xs font-medium ${perfColor}`}>
                              {isPositive ? '+' : ''}{allocation.gainLossPercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {allocation.percentage.toFixed(2)}%
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            ₨{allocation.currentValue.toLocaleString('en-PK', { 
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0 
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Summary Stats */}
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
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {diversificationMetrics.effectiveStocks.toFixed(1)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  effective stocks
                </p>
              </div>
            </div>

            {/* Warnings */}
            {diversificationMetrics.warnings.length > 0 && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Concentration Warnings
                    </p>
                    <ul className="space-y-0.5">
                      {diversificationMetrics.warnings.map((warning, index) => (
                        <li key={index} className="text-xs text-amber-700 dark:text-amber-300">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
