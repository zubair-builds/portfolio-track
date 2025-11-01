'use client';

import { Card, CardContent } from './ui/Card';

export default function MarketStats({ data }) {
  if (!data) return <div className="text-center py-8 text-slate-500 dark:text-slate-400">Data not available</div>;
  
  const { totalVolume, totalValue, totalTrades, symbolCount, gainers, losers, unchanged, topGainers, topLosers } = data;

  return (
    <div className="space-y-8">

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Volume" 
          value={totalVolume?.toLocaleString()} 
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="primary"
        />
        <StatCard 
          title="Total Value" 
          value={totalValue?.toLocaleString()} 
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
          color="success"
        />
        <StatCard 
          title="Total Trades" 
          value={totalTrades?.toLocaleString()} 
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          color="accent"
        />
        <StatCard 
          title="Total Symbols" 
          value={symbolCount?.toLocaleString()} 
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          color="neutral"
        />
      </div>

      {/* Market Sentiment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatIndicator title="Gainers" value={gainers} variant="success" />
        <StatIndicator title="Losers" value={losers} variant="danger" />
        <StatIndicator title="Unchanged" value={unchanged} variant="neutral" />
      </div>

      {/* Top Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MoverList title="Top Gainers" movers={topGainers} type="gainer" />
        <MoverList title="Top Losers" movers={topLosers} type="loser" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    success: 'bg-success-100 text-success-600 dark:bg-success-900/20 dark:text-success-400',
    accent: 'bg-accent-100 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400',
    neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900/20 dark:text-neutral-400',
  };

  return (
    <Card variant="default" className="hover:shadow-lg transition-all duration-150">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {value || 'N/A'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatIndicator({ title, value, variant = 'neutral' }) {
  const variants = {
    success: {
      bg: 'bg-success-50 dark:bg-success-900/10',
      border: 'border-success-200 dark:border-success-800',
      text: 'text-success-600 dark:text-success-400',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
        </svg>
      )
    },
    danger: {
      bg: 'bg-danger-50 dark:bg-danger-900/10',
      border: 'border-danger-200 dark:border-danger-800',
      text: 'text-danger-600 dark:text-danger-400',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
        </svg>
      )
    },
    neutral: {
      bg: 'bg-slate-50 dark:bg-slate-800',
      border: 'border-slate-200 dark:border-slate-700',
      text: 'text-slate-600 dark:text-slate-400',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      )
    }
  };

  const variantClasses = variants[variant];

  return (
    <Card variant="default" className={`${variantClasses.bg} ${variantClasses.border} hover:shadow-lg transition-all duration-150`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
              {title}
            </p>
            <p className={`text-3xl font-bold ${variantClasses.text}`}>
              {value || 0}
            </p>
          </div>
          <div className={`w-10 h-10 ${variantClasses.text} flex items-center justify-center`}>
            {variantClasses.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MoverList({ title, movers, type }) {
  const isGainer = type === 'gainer';
  const textColor = isGainer ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400';
  const bgColor = isGainer ? 'bg-success-50 dark:bg-success-900/10' : 'bg-danger-50 dark:bg-danger-900/10';
  const borderColor = isGainer ? 'border-success-200 dark:border-success-800' : 'border-danger-200 dark:border-danger-800';
  const iconColor = isGainer ? 'text-success-500 dark:text-success-400' : 'text-danger-500 dark:text-danger-400';

  return (
    <Card variant="default" className={`${bgColor} ${borderColor}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 ${iconColor} rounded-lg flex items-center justify-center`}>
            {isGainer ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        
        {movers && movers.length > 0 ? (
          <div className="space-y-3">
            {movers.map((item, index) => (
              <div key={item.symbol} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all duration-150">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-400">
                      {index + 1}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.symbol}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`${textColor} font-bold text-lg`}>
                      {typeof item.price === 'number' ? item.price.toFixed(2) : 'N/A'}
                    </div>
                    <div className={`text-sm ${textColor} font-medium`}>
                      {typeof item.changePercent === 'number' ? `${item.changePercent > 0 ? '+' : ''}${(item.changePercent * 100).toFixed(2)}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-slate-400 dark:text-slate-500 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              No {title.toLowerCase()} data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
