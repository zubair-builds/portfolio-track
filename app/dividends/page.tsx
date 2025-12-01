/**
 * Dividends Page
 * Main page for viewing and managing dividend data
 */

'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProfessionalHeader from '@/components/ProfessionalHeader';
import DividendTable from '@/components/DividendTable';
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
  taxDeducted?: number;
  zakatDeducted?: number;
}

interface DividendStats {
  totalRecords: number;
  upcomingCount: number;
  eligibleCount: number;
  closedCount: number;
  cashCount: number;
  bonusCount: number;
  rightCount: number;
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
  count: number;
}

export default function DividendsPage() {
  const router = useRouter();
  const { user, initializing, signout } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'history' | 'upload'>('history');
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [stats, setStats] = useState<DividendStats | null>(null);
  const [financialStats, setFinancialStats] = useState<DividendFinancialStats | null>(null);
  const [symbolStats, setSymbolStats] = useState<DividendSymbolStat[]>([]);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [symbolDetails, setSymbolDetails] = useState<Record<string, Dividend[]>>({});
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // Changed to true to show upload for all users

  useEffect(() => {
    if (!initializing && !user) {
      router.push('/signin');
    }
  }, [initializing, user, router]);

  useEffect(() => {
    if (user) {
      // Check for admin role
      fetch('/api/auth/check')
        .then(res => res.json())
        .then(data => {
          setIsAdmin(data.user?.role === 'admin' || true); // Allow all authenticated users
        })
        .catch(err => console.error('Error checking role:', err));
    }
  }, [user]);

  useEffect(() => {
    if (activeTab !== 'upload') {
      fetchDividends();
    }
  }, [activeTab]);

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

  const fetchDividends = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/dividends';

      if (activeTab === 'calendar') {
        endpoint += '?status=upcoming';
      } else if (activeTab === 'history') {
        endpoint += '?status=closed';
      }

      const response = await fetch(endpoint);

      if (response.ok) {
        const data = await response.json();
        setDividends(data.data || []);

        // Calculate stats
        if (data.data) {
          const stats: DividendStats = {
            totalRecords: data.data.length,
            upcomingCount: data.data.filter((d: Dividend) => d.eligibilityStatus === 'Upcoming').length,
            eligibleCount: data.data.filter((d: Dividend) => d.eligibilityStatus === 'Eligible').length,
            closedCount: data.data.filter((d: Dividend) => d.eligibilityStatus === 'Closed').length,
            cashCount: data.data.filter((d: Dividend) => d.dividendType === 'Cash').length,
            bonusCount: data.data.filter((d: Dividend) => d.dividendType === 'Bonus').length,
            rightCount: data.data.filter((d: Dividend) => d.dividendType === 'Right Shares').length,
          };
          setStats(stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dividends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    fetchDividends();
    fetchFinancialStats();
    fetchSymbolStats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dividend record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/dividends/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDividends();
      } else {
        alert('Failed to delete dividend');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete dividend');
    }
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 border-l-4 border-l-blue-500">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Gross Dividend</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {financialStats.totalGrossDividend.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-red-500">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tax Paid</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {financialStats.totalTaxDeducted.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-amber-500">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Zakat</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {financialStats.totalZakatDeducted.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Net Dividend</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
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
                      <th className="px-6 py-3 text-right">Gross Dividend</th>
                      <th className="px-6 py-3 text-right">Tax Paid</th>
                      <th className="px-6 py-3 text-right">Net Dividend</th>
                      <th className="px-6 py-3 text-center">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {symbolStats.map((stat) => (
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
                          <td className="px-6 py-3 text-right text-slate-700 dark:text-slate-300">
                            {stat.totalGrossDividend.toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-right text-slate-700 dark:text-slate-300">
                            {stat.totalTaxDeducted.toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {stat.totalNetDividend.toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-center text-slate-600 dark:text-slate-400">
                            {stat.count}
                          </td>
                        </tr>
                        {expandedSymbol === stat.symbol && (
                          <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                      <th className="px-4 py-2">Payment Date</th>
                                      <th className="px-4 py-2">Warrant No</th>
                                      <th className="px-4 py-2 text-right">Gross Amount</th>
                                      <th className="px-4 py-2 text-right">Tax</th>
                                      <th className="px-4 py-2 text-right">Zakat</th>
                                      <th className="px-4 py-2 text-right">Net Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {symbolDetails[stat.symbol] ? (
                                      symbolDetails[stat.symbol].map((detail) => (
                                        <tr key={detail._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                            {detail.paymentDate ? new Date(detail.paymentDate).toLocaleDateString() : '-'}
                                          </td>
                                          <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400">
                                            {detail.warrantNo || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                                            {detail.grossDividend?.toLocaleString() || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                                            {detail.taxDeducted?.toLocaleString() || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-right text-amber-600 dark:text-amber-400">
                                            {detail.zakatDeducted?.toLocaleString() || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
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


        {/* Content */}
        <Card className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <DividendTable
              dividends={dividends}
              onRefresh={fetchDividends}
              showActions={isAdmin}
              onDelete={isAdmin ? handleDelete : undefined}
            />
          )}
        </Card>
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
