'use client';

import { useMemo } from 'react';
import { SectionTitle } from '../ui/SectionTitle';
import EnhancedPortfolioSummary from '../EnhancedPortfolioSummary';
import PortfolioTable from '../PortfolioTable';

import { calculatePortfolioStats, Stock } from '../../lib/portfolioData';

interface PortfolioTabProps {
  stocks: Stock[];
  isLoading?: boolean;
  onEditStock: (stock: Stock) => void;
  onDeleteStock: (stock: Stock) => void;
  onAddStock: () => void;
  onRefresh?: () => void;
  dividendStats?: {
    totalNet: number;
    totalGross: number;
    totalTax: number;
    totalZakat: number;
    bySymbol?: Array<{
      symbol: string;
      netDividend: number;
      grossDividend: number;
      taxDeducted: number;
    }>;
  } | null;
}

export default function PortfolioTab({
  stocks,
  isLoading = false,
  onEditStock,
  onDeleteStock,
  onAddStock,
  onRefresh,
  dividendStats,
}: PortfolioTabProps) {
  const portfolioStats = useMemo(() => {
    const dividendData = dividendStats ? {
      netDividend: dividendStats.totalNet,
      grossDividend: dividendStats.totalGross,
      taxDeducted: dividendStats.totalTax,
      zakatDeducted: dividendStats.totalZakat,
    } : undefined;
    
    return calculatePortfolioStats(stocks, 0, dividendData);
  }, [stocks, dividendStats]);

  if (isLoading && stocks.length === 0) {
    return (
      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            Loading portfolio...
          </div>
          <div className="space-y-4">
            <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Portfolio Summary */}
      <section>
        <SectionTitle
          title="Portfolio Overview"
          description="Your investment summary and key metrics"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <EnhancedPortfolioSummary stats={portfolioStats} />
      </section>


      {/* Holdings Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle
            title="Holdings"
            description={`${stocks.length} stocks in your portfolio`}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
          />
          <button
            onClick={onAddStock}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Stock
          </button>
        </div>
        <PortfolioTable
          stocks={stocks}
          onEditStock={onEditStock}
          onDeleteStock={onDeleteStock}
          onRefresh={onRefresh}
        />
      </section>
    </div>
  );
}

