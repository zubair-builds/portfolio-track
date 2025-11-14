'use client';

interface TimeRangeChange {
  label: string;
  value: number;
  percent: number;
}

interface TimeRangeIndicatorsProps {
  changes?: TimeRangeChange[];
  isLoading?: boolean;
}

export default function TimeRangeIndicators({ changes, isLoading = false }: TimeRangeIndicatorsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 flex-wrap">
        {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((label) => (
          <div key={label} className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  // Default empty changes if not provided
  const defaultChanges: TimeRangeChange[] = changes || [
    { label: '1D', value: 0, percent: 0 },
    { label: '1W', value: 0, percent: 0 },
    { label: '1M', value: 0, percent: 0 },
    { label: '3M', value: 0, percent: 0 },
    { label: '1Y', value: 0, percent: 0 },
    { label: 'ALL', value: 0, percent: 0 },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {defaultChanges.map((change) => {
        const isPositive = change.percent >= 0;
        const hasData = change.value !== 0 || change.percent !== 0;
        
        return (
          <div
            key={change.label}
            className="flex flex-col items-start"
          >
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
              {change.label}
            </span>
            {hasData ? (
              <div className="flex items-center gap-1">
                <span className={`text-sm font-semibold tabular-nums ${
                  isPositive 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {isPositive ? '+' : ''}{change.percent.toFixed(2)}%
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-400 dark:text-slate-500 tabular-nums">
                -
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

