'use client';

import { useMemo } from 'react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

interface DividendIncomeWidgetProps {
  totalNet: number;
  totalGross: number;
  totalTax: number;
  totalZakat?: number;
  count: number;
  bySymbol?: Array<{
    symbol: string;
    netDividend: number;
    grossDividend: number;
    taxDeducted: number;
    count: number;
  }>;
  totalInvestment?: number;
}

export function DividendIncomeWidget({
  totalNet,
  totalGross,
  totalTax,
  totalZakat = 0,
  count,
  bySymbol,
  totalInvestment,
}: DividendIncomeWidgetProps) {
  const dividendYield = totalInvestment && totalInvestment > 0 
    ? (totalNet / totalInvestment) * 100 
    : 0;

  const topDividendPayers = useMemo(() => {
    if (!bySymbol) return [];
    return [...bySymbol]
      .sort((a, b) => b.netDividend - a.netDividend)
      .slice(0, 5);
  }, [bySymbol]);

  const formatCurrency = (amount: number) => {
    return `₨${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (totalNet === 0 && count === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            No Dividend Income Yet
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload your dividend certificates to track your dividend income
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-2 border-green-200 dark:border-green-800">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Dividend Income
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Total received from {count} payment{count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge variant="success" className="text-sm px-3 py-1.5">
            Active
          </Badge>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Net Received
            </p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400 font-mono">
              {formatCurrency(totalNet)}
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Gross Amount
            </p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-mono">
              {formatCurrency(totalGross)}
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Tax Deducted
            </p>
            <p className="text-xl font-semibold text-rose-600 dark:text-rose-400 font-mono">
              {formatCurrency(totalTax)}
            </p>
          </div>

          {dividendYield > 0 && (
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Dividend Yield
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400 font-mono">
                {dividendYield.toFixed(2)}%
              </p>
            </div>
          )}
        </div>

        {/* Top Dividend Payers */}
        {topDividendPayers.length > 0 && (
          <div className="pt-4 border-t border-green-200 dark:border-green-800">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Top Dividend Payers
            </h4>
            <div className="space-y-2">
              {topDividendPayers.map((item, index) => (
                <div
                  key={item.symbol}
                  className="flex items-center justify-between bg-white/40 dark:bg-slate-800/40 rounded-lg p-3 border border-green-100 dark:border-green-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.symbol}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {item.count} payment{item.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(item.netDividend)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tax: {formatCurrency(item.taxDeducted)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Info */}
        {totalZakat > 0 && (
          <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Zakat Deducted</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalZakat)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
