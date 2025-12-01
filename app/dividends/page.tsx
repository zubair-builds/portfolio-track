/**
 * Dividends Page
 * Main page for viewing and managing dividend data
 */

'use client';

import { useState, useEffect } from 'react';
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
  const { user, initializing, signout } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'history' | 'upload'>('history');
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [stats, setStats] = useState<DividendStats | null>(null);
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
