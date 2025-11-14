'use client';

import { useState } from 'react';
import { useCompanyData } from '../hooks/useCompanyData';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface CompanyInfoProps {
  symbol: string;
}

export function CompanyInfo({ symbol }: CompanyInfoProps) {
  const { company, loading, error, refreshing, refresh } = useCompanyData(symbol);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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

  const descriptionPreview = company.businessDescription.substring(0, 400);
  const isLongDescription = company.businessDescription.length > 400;

  return (
    <div className="space-y-4">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Company Information
        </h3>
        <Button
          onClick={refresh}
          disabled={refreshing}
          variant="secondary"
          className="flex items-center gap-2 text-xs px-3 py-1.5"
        >
          <svg
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
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

      {/* Compact Financial Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

        <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Shares</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
            {(company.shares / 1_000_000).toFixed(1)}M
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Free Float</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
            {(company.freeFloat / 1_000_000).toFixed(1)}M
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Free Float %</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              {company.freeFloatPercent.toFixed(2)}%
            </p>
            <Badge variant={company.freeFloatPercent >= 50 ? 'success' : 'danger'} className="text-xs">
              {company.freeFloatPercent >= 50 ? 'High' : 'Low'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Business Description and Key People - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Collapsible Business Description */}
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Business Description
            </h4>
            {isLongDescription && (
              <svg
                className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${
                  isDescriptionExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
          <div className="px-4 pb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isDescriptionExpanded || !isLongDescription
                ? company.businessDescription
                : `${descriptionPreview}...`}
            </p>
          </div>
        </div>

        {/* Compact Key People Table */}
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Key People</h4>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {company.keyPeople.map((person, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition"
              >
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {person.name}
                </span>
                <Badge variant="neutral" className="text-xs">
                  {person.position}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

