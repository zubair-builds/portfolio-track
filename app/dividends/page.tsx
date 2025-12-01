/**
 * Dividends Page
 * Main page for viewing and managing dividend data
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Header from '@/components/Header';
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

export default function DividendsPage() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'history' | 'upload'>('calendar');
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [stats, setStats] = useState<DividendStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
          setIsAdmin(data.user?.role === 'admin');
        })
        .catch(err => console.error('Error checking role:', err));
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin || activeTab !== 'upload') {
      fetchDividends();
    }
  }, [activeTab, isAdmin]);



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
      <Header />

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
            {isAdmin && (
              <Button
                variant="primary"
                onClick={() => setShowUploadModal(true)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Data
              </Button>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card className="p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalRecords}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-blue-600 dark:text-blue-400">Upcoming</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.upcomingCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Eligible</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.eligibleCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Closed</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.closedCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-green-600 dark:text-green-400">Cash</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.cashCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-purple-600 dark:text-purple-400">Bonus</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.bonusCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">Right</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.rightCount}</p>
              </Card>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'calendar'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              📊 History
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('upload')}
                className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                ⬆️ Upload
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <Card className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'upload' ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Upload Dividend Data
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Upload Excel or CSV files with dividend announcements
              </p>
              <Button variant="primary" onClick={() => setShowUploadModal(true)}>
                Select File
              </Button>
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
