/**
 * Dividends Page
 * Main page for viewing and managing dividend data
 */

'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProfessionalHeader from '@/components/ProfessionalHeader';
import DividendUploadModal from '@/components/DividendUploadModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Dividend {
  _id: string;
  symbol: string;
  companyName: string;
  sector: string;
  dividendType: 'Cash' | 'Bonus' | 'Right Shares';
  announcementDate: string;
  exDividendDate: string;
  bookClosureStart: string;
  bookClosureEnd: string;
  paymentDate?: string;
  agmDate?: string;
  dividendRate?: number;
  dividendPerShare?: number;
  faceValue?: number;
  bonusRatio?: string;
  rightRatio?: string;
  eligibilityStatus?: 'Upcoming' | 'Eligible' | 'Closed';
  daysUntilPayment?: number;
  // Payment fields
  warrantNo?: string;
  filerStatus?: string;
  netDividend?: number;
  grossDividend?: number;
  shares?: number;
  taxDeducted?: number;
  zakatDeducted?: number;
}


interface DividendFinancialStats {
  totalNetDividend: number;
  totalGrossDividend: number;
  totalTaxDeducted: number;
  totalZakatDeducted: number;
  count: number;
}

interface DividendSymbolStat {
  symbol: string;
  companyName: string;
  totalNetDividend: number;
  totalGrossDividend: number;
  totalTaxDeducted: number;
  totalZakatDeducted: number;
  count: number;
}

export default function DividendsPage() {
  const router = useRouter();
  const { user, initializing, signout } = useAuth();
  const [financialStats, setFinancialStats] = useState<DividendFinancialStats | null>(null);
  const [symbolStats, setSymbolStats] = useState<DividendSymbolStat[]>([]);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [symbolDetails, setSymbolDetails] = useState<Record<string, Dividend[]>>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sortField, setSortField] = useState<'gross' | 'tax' | 'zakat' | 'net' | 'count'>('net');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!initializing && !user) {
      router.push('/signin');
    }
  }, [initializing, user, router]);


  useEffect(() => {
    fetchFinancialStats();
    fetchSymbolStats();
  }, []);

  const fetchFinancialStats = async () => {
    try {
      const response = await fetch('/api/dividends/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFinancialStats(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch financial stats:', error);
    }
  };

  const fetchSymbolStats = async () => {
    try {
      const response = await fetch('/api/dividends/stats/by-symbol');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSymbolStats(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch symbol stats:', error);
    }
  };

  const toggleExpand = async (symbol: string) => {
    if (expandedSymbol === symbol) {
      setExpandedSymbol(null);
      return;
    }

    setExpandedSymbol(symbol);

    // Fetch details if not already cached
    if (!symbolDetails[symbol]) {
      try {
        const response = await fetch(`/api/dividends?symbols=${encodeURIComponent(symbol)}&status=closed`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSymbolDetails(prev => ({
              ...prev,
              [symbol]: data.data
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch symbol details:', error);
      }
    }
  };

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    fetchFinancialStats();
    fetchSymbolStats();
  };

  const handleSort = (field: 'gross' | 'tax' | 'zakat' | 'net' | 'count') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedSymbolStats = [...symbolStats].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (sortField) {
      case 'gross':
        aValue = a.totalGrossDividend;
        bValue = b.totalGrossDividend;
        break;
      case 'tax':
        aValue = a.totalTaxDeducted;
        bValue = b.totalTaxDeducted;
        break;
      case 'zakat':
        aValue = a.totalZakatDeducted;
        bValue = b.totalZakatDeducted;
        break;
      case 'net':
        aValue = a.totalNetDividend;
        bValue = b.totalNetDividend;
        break;
      case 'count':
        aValue = a.count;
        bValue = b.count;
        break;
      default:
        aValue = a.totalNetDividend;
        bValue = b.totalNetDividend;
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
  };
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ProfessionalHeader user={user} onSignOut={signout} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Dividend Calendar
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Track dividend announcements, ex-dividend dates, and payment schedules
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowUploadModal(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Data
            </Button>
          </div>

        </div>

        {/* Financial Stats Cards */}
        {financialStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="p-4 border-l-4 border-l-indigo-500">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Dividends</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {financialStats.count.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-blue-500">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Gross Dividend</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {financialStats.totalGrossDividend.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-red-500">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tax Paid</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {financialStats.totalTaxDeducted.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-amber-500">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Zakat</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {financialStats.totalZakatDeducted.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Net Dividend</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {financialStats.totalNetDividend.toLocaleString()}
              </p>
            </Card>
          </div>
        )}

        {/* Symbol Breakdown */}
        {symbolStats.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Dividend Breakdown by Company</h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3">Symbol</th>
                      <th className="px-6 py-3 text-center">
                        <button
                          onClick={() => handleSort('count')}
                          className="flex items-center justify-center gap-1 w-full hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          Count
                          {sortField === 'count' && (
                            <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleSort('gross')}
                          className="flex items-center justify-end gap-1 w-full hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          Gross Dividend
                          {sortField === 'gross' && (
                            <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleSort('tax')}
                          className="flex items-center justify-end gap-1 w-full hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          Tax Paid
                          {sortField === 'tax' && (
                            <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleSort('zakat')}
                          className="flex items-center justify-end gap-1 w-full hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          Zakat Paid
                          {sortField === 'zakat' && (
                            <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleSort('net')}
                          className="flex items-center justify-end gap-1 w-full hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          Net Dividend
                          {sortField === 'net' && (
                            <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      </th>

                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sortedSymbolStats.map((stat) => (
                      <Fragment key={stat.symbol}>
                        <tr
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          onClick={() => toggleExpand(stat.symbol)}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <svg
                                className={`w-4 h-4 text-slate-400 transition-transform ${expandedSymbol === stat.symbol ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">{stat.symbol}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{stat.companyName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center font-medium text-indigo-600 dark:text-indigo-400">
                            {stat.count}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-blue-600 dark:text-blue-400">
                            {stat.totalGrossDividend.toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-red-600 dark:text-red-400">
                            {stat.totalTaxDeducted.toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-amber-600 dark:text-amber-400">
                            {stat.totalZakatDeducted.toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {stat.totalNetDividend.toLocaleString()}
                          </td>
                        </tr>
                        {expandedSymbol === stat.symbol && (
                          <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                      <th className="px-4 py-2">Payment Date</th>
                                      <th className="px-4 py-2">Shares</th>
                                      <th className="px-4 py-2 text-right">Gross Amount</th>
                                      <th className="px-2 py-2 text-right">Tax</th>
                                      <th className="px-3 py-2 text-right">Zakat</th>
                                      <th className="px-1 py-2 text-right">Net Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {symbolDetails[stat.symbol] ? (
                                      symbolDetails[stat.symbol].map((detail) => (
                                        <tr key={detail._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">

                                            {formatDate(detail.paymentDate)}
                                          </td>
                                          <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400">
                                            {detail.shares || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-right  text-blue-600 dark:text-blue-400">
                                            {detail.grossDividend?.toLocaleString() || '-'}
                                          </td>
                                          <td className="px-2 py-2 text-right text-red-600 dark:text-red-400">
                                            {detail.taxDeducted?.toLocaleString() || '-'}
                                          </td>
                                          <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">
                                            {detail.zakatDeducted?.toLocaleString() || '-'}
                                          </td>
                                          <td className="px-1 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                            {detail.netDividend?.toLocaleString() || '-'}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                          <div className="flex justify-center">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <DividendUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
