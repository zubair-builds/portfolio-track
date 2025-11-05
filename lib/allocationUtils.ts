import { Stock } from './portfolioData';
import { SymbolMetadata } from '../hooks/useSymbolMetadata';

export interface StockWithMetadata extends Stock {
  name?: string;
  sectorName?: string;
  currentValue: number;
  allocation: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface SectorAllocation {
  sectorName: string;
  totalValue: number;
  percentage: number;
  stocks: StockWithMetadata[];
  avgGainLossPercent: number;
  color: string;
  stockCount: number;
}

export interface DiversificationMetrics {
  hhi: number; // Herfindahl-Hirschman Index (0-10,000)
  effectiveStocks: number; // Effective number of stocks
  sectorHHI: number; // Sector-level HHI
  effectiveSectors: number; // Effective number of sectors
  concentrationRisk: 'low' | 'medium' | 'high';
  warnings: string[];
}

/**
 * Enrich stocks with metadata and calculated values
 */
export function enrichStocksWithMetadata(
  stocks: Stock[],
  metadata: Map<string, SymbolMetadata>
): StockWithMetadata[] {
  const totalValue = stocks.reduce((sum, stock) => sum + stock.shares * stock.currentPrice, 0);

  return stocks.map(stock => {
    const meta = metadata.get(stock.symbol.toUpperCase());
    const currentValue = stock.shares * stock.currentPrice;
    const investment = stock.shares * stock.avgBuy;
    const gainLoss = currentValue - investment;
    const gainLossPercent = ((stock.currentPrice - stock.avgBuy) / stock.avgBuy) * 100;

    return {
      ...stock,
      name: meta?.name || stock.symbol,
      sectorName: meta?.sectorName || 'Unknown',
      currentValue,
      allocation: totalValue > 0 ? (currentValue / totalValue) * 100 : 0,
      gainLoss,
      gainLossPercent: Number.isFinite(gainLossPercent) ? gainLossPercent : 0,
    };
  });
}

/**
 * Group stocks by sector and calculate sector allocations
 */
export function calculateSectorAllocations(
  stocksWithMetadata: StockWithMetadata[],
  colorPalette: string[]
): SectorAllocation[] {
  const sectorMap = new Map<string, StockWithMetadata[]>();

  // Group by sector
  stocksWithMetadata.forEach(stock => {
    const sector = stock.sectorName || 'Unknown';
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, []);
    }
    sectorMap.get(sector)!.push(stock);
  });

  // Calculate totals
  const totalValue = stocksWithMetadata.reduce((sum, stock) => sum + stock.currentValue, 0);

  // Create sector allocations
  const sectors: SectorAllocation[] = [];
  let colorIndex = 0;

  sectorMap.forEach((stocks, sectorName) => {
    const sectorTotalValue = stocks.reduce((sum, stock) => sum + stock.currentValue, 0);
    const percentage = totalValue > 0 ? (sectorTotalValue / totalValue) * 100 : 0;
    
    // Calculate average gain/loss percent for the sector (weighted by value)
    const weightedGainLoss = stocks.reduce((sum, stock) => {
      return sum + (stock.gainLossPercent * stock.currentValue);
    }, 0);
    const avgGainLossPercent = sectorTotalValue > 0 ? weightedGainLoss / sectorTotalValue : 0;

    sectors.push({
      sectorName,
      totalValue: sectorTotalValue,
      percentage,
      stocks,
      avgGainLossPercent,
      color: colorPalette[colorIndex % colorPalette.length],
      stockCount: stocks.length,
    });

    colorIndex++;
  });

  // Sort by total value (descending)
  return sectors.sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Calculate diversification metrics
 */
export function calculateDiversificationMetrics(
  stockAllocations: { percentage: number }[],
  sectorAllocations: SectorAllocation[]
): DiversificationMetrics {
  // Stock-level HHI (0-10,000, lower = more diversified)
  const hhi = stockAllocations.reduce((sum, a) => sum + Math.pow(a.percentage, 2), 0);
  
  // Effective number of stocks
  const effectiveStocks = stockAllocations.reduce((sum, a) => {
    return sum + Math.pow(a.percentage / 100, 2);
  }, 0);
  const effectiveStocksCount = effectiveStocks > 0 ? 1 / effectiveStocks : 0;

  // Sector-level HHI
  const sectorHHI = sectorAllocations.reduce((sum, s) => sum + Math.pow(s.percentage, 2), 0);
  
  // Effective number of sectors
  const effectiveSectors = sectorAllocations.reduce((sum, s) => {
    return sum + Math.pow(s.percentage / 100, 2);
  }, 0);
  const effectiveSectorsCount = effectiveSectors > 0 ? 1 / effectiveSectors : 0;

  // Determine concentration risk level
  let concentrationRisk: 'low' | 'medium' | 'high' = 'low';
  if (hhi > 2500) {
    concentrationRisk = 'high';
  } else if (hhi > 1500) {
    concentrationRisk = 'medium';
  }

  // Generate warnings
  const warnings: string[] = [];
  
  // Check for individual position concentration
  const largestPosition = Math.max(...stockAllocations.map(a => a.percentage));
  if (largestPosition > 20) {
    warnings.push(`Largest position (${largestPosition.toFixed(1)}%) exceeds 20% of portfolio`);
  }

  // Check top 3 concentration
  const top3 = stockAllocations
    .slice()
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3)
    .reduce((sum, a) => sum + a.percentage, 0);
  
  if (top3 > 50) {
    warnings.push(`Top 3 positions (${top3.toFixed(1)}%) exceed 50% of portfolio`);
  }

  // Check sector concentration
  const largestSector = Math.max(...sectorAllocations.map(s => s.percentage));
  if (largestSector > 40) {
    warnings.push(`Largest sector (${largestSector.toFixed(1)}%) exceeds 40% of portfolio`);
  }

  // Check if too few stocks
  if (stockAllocations.length < 5) {
    warnings.push(`Portfolio has fewer than 5 positions (${stockAllocations.length})`);
  }

  return {
    hhi,
    effectiveStocks: effectiveStocksCount,
    sectorHHI,
    effectiveSectors: effectiveSectorsCount,
    concentrationRisk,
    warnings,
  };
}

/**
 * Get performance color based on gain/loss percentage
 * Returns color from red (loss) through yellow (neutral) to green (gain)
 */
export function getPerformanceColor(gainLossPercent: number): string {
  // Clamp to -50% to +50% range for color mapping
  const clamped = Math.max(-50, Math.min(50, gainLossPercent));
  
  if (clamped < -10) {
    return '#dc2626'; // Strong red
  } else if (clamped < -5) {
    return '#ef4444'; // Red
  } else if (clamped < -2) {
    return '#f87171'; // Light red
  } else if (clamped < 2) {
    return '#94a3b8'; // Neutral gray
  } else if (clamped < 5) {
    return '#4ade80'; // Light green
  } else if (clamped < 10) {
    return '#22c55e'; // Green
  } else {
    return '#16a34a'; // Strong green
  }
}

/**
 * Get risk level color
 */
export function getRiskColor(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low':
      return '#22c55e'; // Green
    case 'medium':
      return '#eab308'; // Yellow
    case 'high':
      return '#ef4444'; // Red
  }
}

