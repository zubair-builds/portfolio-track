'use client';

interface ComparisonIndicatorProps {
  portfolioReturn: number;
  benchmarkReturn: number;
  benchmarkName?: string;
}

export default function ComparisonIndicator({ 
  portfolioReturn, 
  benchmarkReturn, 
  benchmarkName = 'KSE-100' 
}: ComparisonIndicatorProps) {
  const difference = portfolioReturn - benchmarkReturn;
  const isOutperforming = difference > 0;
  const absDifference = Math.abs(difference);

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/60 dark:bg-slate-800/60 rounded-lg backdrop-blur-sm border border-slate-200 dark:border-slate-700">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          vs {benchmarkName}
        </p>
        <div className="flex items-baseline gap-2">
          <span className={`text-lg font-bold tabular-nums ${isOutperforming ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isOutperforming ? '+' : ''}{difference.toFixed(2)}%
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(2)}% vs {benchmarkReturn >= 0 ? '+' : ''}{benchmarkReturn.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isOutperforming ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
        {isOutperforming ? (
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6 6" />
          </svg>
        )}
      </div>
    </div>
  );
}



