'use client';

import { SectorAllocation as SectorAlloc } from '../lib/allocationUtils';
import { Card, CardContent } from './ui/Card';

interface SectorAllocationProps {
  sectors: SectorAlloc[];
  totalValue: number;
  onSectorClick?: (sector: SectorAlloc) => void;
}

export default function SectorAllocation({ sectors, totalValue, onSectorClick }: SectorAllocationProps) {
  if (sectors.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-600 dark:text-slate-300">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No sector data</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Add holdings to view sector distribution.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalValueLabel = totalValue.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Sector Allocation
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {sectors.length} sectors • ₨{totalValueLabel}
              </p>
            </div>
          </div>

          {/* Horizontal Stacked Bar */}
          <div className="space-y-2">
            <div className="flex items-center h-12 rounded-lg overflow-hidden shadow-sm">
              {sectors.map((sector) => (
                <div
                  key={sector.sectorName}
                  className="h-full transition-all duration-300 hover:opacity-80 cursor-pointer flex items-center justify-center"
                  style={{
                    width: `${sector.percentage}%`,
                    backgroundColor: sector.color,
                  }}
                  onClick={() => onSectorClick?.(sector)}
                  title={`${sector.sectorName}: ${sector.percentage.toFixed(2)}%`}
                >
                  {sector.percentage > 8 && (
                    <span className="text-xs font-semibold text-white px-2 truncate">
                      {sector.sectorName}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click a sector to see detailed holdings
            </p>
          </div>

          {/* Sector List with Horizontal Bars */}
          <div className="space-y-3">
            {sectors.map((sector) => {
              const isPositive = sector.avgGainLossPercent >= 0;
              const perfColor = isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400';

              return (
                <div
                  key={sector.sectorName}
                  className="space-y-2 rounded-lg bg-slate-50 p-3 transition-all hover:shadow-md hover:scale-[1.01] dark:bg-slate-800/50 dark:hover:bg-slate-800 cursor-pointer"
                  onClick={() => onSectorClick?.(sector)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className="h-4 w-4 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: sector.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {sector.sectorName}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {sector.stockCount} {sector.stockCount === 1 ? 'stock' : 'stocks'} •{' '}
                          <span className={perfColor}>
                            {isPositive ? '+' : ''}
                            {sector.avgGainLossPercent.toFixed(2)}%
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {sector.percentage.toFixed(2)}%
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        ₨{sector.totalValue.toLocaleString('en-PK', { 
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0 
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress bar showing allocation */}
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${sector.percentage}%`,
                        backgroundColor: sector.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
                Largest Sector
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate px-1">
                {sectors[0]?.sectorName}
              </p>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {sectors[0]?.percentage.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
                Total Sectors
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {sectors.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">sectors</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-1">
                Top 3 Sectors
              </p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {sectors
                  .slice(0, 3)
                  .reduce((sum, s) => sum + s.percentage, 0)
                  .toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">of portfolio</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

