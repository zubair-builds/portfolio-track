'use client';

interface KeyStatsBarProps {
  peRatio?: number;
  marketCap?: string | number;
  volume?: number;
  weekRange52Low?: number;
  weekRange52High?: number;
  className?: string;
}

export function KeyStatsBar({
  peRatio,
  marketCap,
  volume,
  weekRange52Low,
  weekRange52High,
  className = '',
}: KeyStatsBarProps) {
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol: number | undefined) => {
    if (vol === undefined || vol === null) return 'N/A';
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
    return vol.toLocaleString();
  };

  const formatMarketCap = (cap: string | number | undefined) => {
    if (cap === undefined || cap === null) return 'N/A';
    if (typeof cap === 'string') return cap;
    if (cap >= 1_000_000_000) return `${(cap / 1_000_000_000).toFixed(2)}B`;
    if (cap >= 1_000_000) return `${(cap / 1_000_000).toFixed(2)}M`;
    return formatNumber(cap);
  };

  const stats = [
    {
      label: 'P/E Ratio',
      value: peRatio !== undefined ? peRatio.toFixed(2) : 'N/A',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'Market Cap',
      value: formatMarketCap(marketCap),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Volume',
      value: formatVolume(volume),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: '52W Range',
      value:
        weekRange52Low !== undefined && weekRange52High !== undefined
          ? `₨${formatNumber(weekRange52Low)} - ₨${formatNumber(weekRange52High)}`
          : 'N/A',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 ${className}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
          >
            <div className="text-slate-500 dark:text-slate-400">{stat.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                {stat.label}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono truncate">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

