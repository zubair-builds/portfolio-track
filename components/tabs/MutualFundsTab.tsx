'use client';

import { SectionTitle } from '../ui/SectionTitle';
import { Button } from '../ui/Button';
import MutualFundsTable from '../MutualFundsTable';
import { MutualFundHolding } from '../../hooks/useMutualFundData';

interface MutualFundsTabProps {
  holdings: MutualFundHolding[];
  isLoading?: boolean;
  onDeleteHolding: (holding: MutualFundHolding) => void;
  onAddHolding: () => void;
  onUploadTransactions: () => void;
  onRefresh?: () => void;
}

export default function MutualFundsTab({
  holdings,
  isLoading = false,
  onDeleteHolding,
  onAddHolding,
  onUploadTransactions,

}: MutualFundsTabProps) {
  if (isLoading && holdings.length === 0) {
    return (
      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            Loading mutual funds...
          </div>
          <div className="space-y-4">
            <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </section>
      </div>
    );
  }

  // Calculate summary stats
  const totalInvested = holdings.reduce((sum, h) => sum + (h.totalInvested || 0), 0);
  const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Funds</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {holdings.length}
            </div>
          </div>
          <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Invested</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              ₨{totalInvested.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Current Value</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              ₨{totalValue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Gain/Loss</div>
            <div
              className={`text-2xl font-bold ${totalGainLoss >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
                }`}
            >
              {totalGainLoss >= 0 ? '+' : ''}
              ₨{totalGainLoss.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-lg ml-1">
                ({totalGainLossPercent >= 0 ? '+' : ''}
                {totalGainLossPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Holdings Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle
            title="Mutual Fund Holdings"
            description={`${holdings.length} fund${holdings.length !== 1 ? 's' : ''} in your portfolio`}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <div className="flex gap-2">
            <Button
              onClick={onUploadTransactions}
              variant="outline"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Transactions
            </Button>
            <Button
              onClick={onAddHolding}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Fund
            </Button>
          </div>
        </div>
        <MutualFundsTable
          holdings={holdings}
          onDeleteHolding={onDeleteHolding}

        />
      </section>
    </div>
  );
}


