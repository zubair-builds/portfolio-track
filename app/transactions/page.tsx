/**
 * Transactions Page
 * Complete transaction history with filters and statistics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfessionalHeader from '@/components/ProfessionalHeader';
import TransactionsTable from '@/components/TransactionsTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/AuthProvider';
import { formatCurrency } from '@/lib/constants';
import TransactionUploadModal from '@/components/TransactionUploadModal';

interface TransactionStats {
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;
  totalRealizedGains: number;
  totalCGTPaid: number;
}

export default function TransactionsPage() {
  const router = useRouter();
  const { user, initializing, signout } = useAuth();
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!user && !initializing) {
      router.replace('/signin');
    }
  }, [user, initializing, router]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/transactions/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSignOut = () => {
    signout();
    router.replace('/signin');
  };

  if (initializing || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <ProfessionalHeader user={user} onSignOut={handleSignOut} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Transaction History
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Complete record of all your stock transactions with FIFO-based gain calculations
              </p>
            </div>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              Upload Transactions
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Total Transactions */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Transactions</p>
                {loadingStats ? (
                  <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {stats?.totalTransactions || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </Card>

          {/* Total Buys */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Buys</p>
                {loadingStats ? (
                  <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats?.totalBuys || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </Card>

          {/* Total Sells */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Sells</p>
                {loadingStats ? (
                  <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {stats?.totalSells || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>
          </Card>

          {/* Net Realized Gains */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Net Realized Gains</p>
                {loadingStats ? (
                  <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
                ) : (
                  <p className={`text-2xl font-bold mt-1 ${(stats?.totalRealizedGains || 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                    }`}>
                    {(stats?.totalRealizedGains || 0) >= 0 ? '+' : ''}
                    {formatCurrency(stats?.totalRealizedGains || 0)}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          {/* Total CGT Paid */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total CGT Paid</p>
                {loadingStats ? (
                  <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                    {formatCurrency(stats?.totalCGTPaid || 0)}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Transactions Table */}
        <TransactionsTable userId={user.email} />
      </main>

      <TransactionUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={() => {
          fetchStats();
          // Ideally we should also refresh the table, but that might require lifting state or using a context/event
          window.location.reload(); // Simple refresh for now to update table and stats
        }}
      />
    </div>
  );
}
