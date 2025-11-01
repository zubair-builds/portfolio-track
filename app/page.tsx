'use client';

import { useState } from "react";
import { SectionTitle } from "../components/ui/SectionTitle";
import { Badge } from "../components/ui/Badge";
import PortfolioSummary from "../components/PortfolioSummary";
import PortfolioTable from "../components/PortfolioTable";
import PortfolioAllocation from "../components/PortfolioAllocation";
import CacheManager from "../components/CacheManager";
import StockDetailsModal from "../components/StockDetailsModal";
import Watchlist from "../components/Watchlist";
import { calculatePortfolioStats, Stock } from "../lib/portfolioData";
import { usePortfolioData } from "../hooks/usePortfolioData";

export default function Page() {
  const { stocks, watchlist, isLoading, error, lastUpdated } = usePortfolioData();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const portfolioStats = calculatePortfolioStats(stocks);
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/70">
        <div className="container mx-auto max-w-7xl flex items-center justify-between py-6 px-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              My Portfolio
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Track your stock investments and performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Badge variant="live">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                </span>
                Loading...
              </Badge>
            ) : (
              <Badge variant="live">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                Updated • {lastUpdatedLabel}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-7xl space-y-8 py-8 px-4">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 mt-0.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

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
            <PortfolioSummary stats={portfolioStats} />
          </section>

          {/* Portfolio Allocation */}
          <section>
            <SectionTitle
              title="Portfolio Allocation"
              description="How your investments are distributed"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              }
            />
            <PortfolioAllocation stocks={stocks} />
          </section>

          {/* Watchlist */}
          <section>
            <SectionTitle
              title="Watchlist"
              description="Symbols you're monitoring for potential entries"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12 18 19.5 12 19.5 1.5 12 1.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            />
            <Watchlist items={watchlist} isLoading={isLoading} />
          </section>

          {/* Holdings Table */}
          <section>
            <SectionTitle
              title="Holdings"
              description={`${stocks.length} stocks in your portfolio`}
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
            />
            <PortfolioTable stocks={stocks} onSelectStock={setSelectedStock} />
          </section>
        </div>
      </main>

      {/* Cache Manager */}
      <CacheManager />

      {/* Stock Details Modal */}
      {selectedStock && (
        <StockDetailsModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t bg-white/80 dark:bg-slate-950/70">
        <div className="container mx-auto max-w-7xl flex flex-col items-start justify-between gap-3 py-6 px-4 text-sm text-slate-600 dark:text-slate-400 md:flex-row">
          <span>© {new Date().getFullYear()} My Portfolio Tracker</span>
          <span className="text-xs">This is informational and not investment advice.</span>
        </div>
      </footer>
    </div>
  );
}

