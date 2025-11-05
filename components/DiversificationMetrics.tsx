'use client';

import { DiversificationMetrics as Metrics, getRiskColor } from '../lib/allocationUtils';
import { Card, CardContent } from './ui/Card';

interface DiversificationMetricsProps {
  metrics: Metrics;
}

export default function DiversificationMetrics({ metrics }: DiversificationMetricsProps) {
  const riskColor = getRiskColor(metrics.concentrationRisk);
  const riskLabel = metrics.concentrationRisk.charAt(0).toUpperCase() + metrics.concentrationRisk.slice(1);

  // Determine HHI interpretation
  let hhiLabel = 'Highly Diversified';
  if (metrics.hhi > 2500) {
    hhiLabel = 'Concentrated';
  } else if (metrics.hhi > 1500) {
    hhiLabel = 'Moderately Diversified';
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Diversification Analysis
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Portfolio concentration and risk metrics
            </p>
          </div>

          {/* Risk Level Badge */}
          <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: riskColor }}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Concentration Risk:
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: riskColor }}
              >
                {riskLabel}
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* HHI */}
            <div className="text-center p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">
                HHI Score
              </p>
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {metrics.hhi.toFixed(0)}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                {hhiLabel}
              </p>
            </div>

            {/* Effective Stocks */}
            <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">
                Effective Stocks
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {metrics.effectiveStocks.toFixed(1)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                of {metrics.effectiveStocks.toFixed(0)} holdings
              </p>
            </div>

            {/* Sector HHI */}
            <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                Sector HHI
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {metrics.sectorHHI.toFixed(0)}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {metrics.sectorHHI < 1500 ? 'Well diversified' : 'Concentrated'}
              </p>
            </div>

            {/* Effective Sectors */}
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
                Effective Sectors
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {metrics.effectiveSectors.toFixed(1)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                sector exposure
              </p>
            </div>
          </div>

          {/* Warnings */}
          {metrics.warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Risk Warnings
                </span>
              </div>
              <div className="space-y-1">
                {metrics.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
                  >
                    <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HHI Explainer */}
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t pt-4 border-slate-200 dark:border-slate-700">
            <p className="font-medium">About these metrics:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li><strong>HHI</strong>: Lower is better (0 = perfect diversification, 10,000 = single stock)</li>
              <li><strong>Effective Stocks</strong>: Number of equally-weighted stocks that would give same diversification</li>
              <li><strong>Sector HHI</strong>: Concentration across sectors (should be &lt; 1,500 for good diversification)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

