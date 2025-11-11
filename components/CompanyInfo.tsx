'use client';

import { useCompanyData } from '../hooks/useCompanyData';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface CompanyInfoProps {
  symbol: string;
}

export function CompanyInfo({ symbol }: CompanyInfoProps) {
  const { company, loading, error, refreshing, refresh } = useCompanyData(symbol);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button onClick={refresh} disabled={refreshing} variant="primary">
          {refreshing ? 'Refreshing...' : 'Try Again'}
        </Button>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          No company data available for {symbol}
        </p>
        <Button onClick={refresh} disabled={refreshing} variant="primary">
          {refreshing ? 'Fetching...' : 'Fetch Company Data'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Company Information
        </h3>
        <Button
          onClick={refresh}
          disabled={refreshing}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Market Cap</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Rs. {(company.marketCap / 1_000_000).toFixed(1)}M
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Shares</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {(company.shares / 1_000_000).toFixed(1)}M
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Free Float</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {(company.freeFloat / 1_000_000).toFixed(1)}M
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Free Float %</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {company.freeFloatPercent.toFixed(2)}%
            </p>
            <Badge variant={company.freeFloatPercent >= 50 ? 'success' : 'danger'}>
              {company.freeFloatPercent >= 50 ? 'High' : 'Low'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Business Description */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Business Description
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {company.businessDescription}
        </p>
      </div>

      {/* Key People */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Key People
        </h4>
        <div className="space-y-2">
          {company.keyPeople.map((person, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 dark:border-slate-700"
            >
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {person.name}
              </span>
              <Badge variant="neutral">{person.position}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Data scraped at: {new Date(company.scrapedAt).toLocaleString()}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Last updated: {new Date(company.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

