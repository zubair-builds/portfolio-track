'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/Card';

interface AnalyticsData {
  totalStocks: number;
  totalInvestment: number;
  averageHoldingSize: number;
  largestPosition: {
    symbol: string;
    value: number;
    percentage: number;
  } | null;
  concentrationRisk: number;
  topFiveHoldings: Array<{
    symbol: string;
    value: number;
    percentage: number;
  }>;
}

interface Props {
  userEmail: string | undefined;
}

export default function PortfolioAnalytics({ userEmail }: Props) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/analytics', {
          headers: {
            'X-User-Id': userEmail,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics(data.analytics);
      } catch (err) {
        console.error('Analytics error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userEmail]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
            <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
            Loading analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {error || 'Analytics unavailable'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRiskLevel = (concentration: number) => {
    if (concentration > 60) return { label: 'High', color: 'text-rose-600 dark:text-rose-400' };
    if (concentration > 40) return { label: 'Medium', color: 'text-amber-600 dark:text-amber-400' };
    return { label: 'Low', color: 'text-emerald-600 dark:text-emerald-400' };
  };

  const riskLevel = getRiskLevel(analytics.concentrationRisk);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Stocks */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
            Total Positions
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics.totalStocks}
          </p>
        </CardContent>
      </Card>

      {/* Average Holding Size */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
            Avg Position Size
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            ₨{analytics.averageHoldingSize.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
          </p>
        </CardContent>
      </Card>

      {/* Largest Position */}
      {analytics.largestPosition && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
              Largest Position
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {analytics.largestPosition.symbol}
            </p>
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              {analytics.largestPosition.percentage.toFixed(1)}% of portfolio
            </p>
          </CardContent>
        </Card>
      )}

      {/* Concentration Risk */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${riskLevel.label === 'High' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                riskLevel.label === 'Medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
              }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
            Concentration Risk
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics.concentrationRisk.toFixed(1)}%
          </p>
          <p className={`text-sm font-semibold ${riskLevel.color}`}>
            {riskLevel.label} Risk
          </p>
        </CardContent>
      </Card>

      {/* Top Holdings Breakdown */}
      {analytics.topFiveHoldings && analytics.topFiveHoldings.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Top 5 Holdings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {analytics.topFiveHoldings.map((holding, index) => (
                <div
                  key={holding.symbol}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold dark:bg-indigo-900/20 dark:text-indigo-400">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {holding.symbol}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    ₨{holding.value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {holding.percentage.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

