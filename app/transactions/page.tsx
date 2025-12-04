/**
 * Transactions Page
 * Complete transaction history with filters and statistics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfessionalHeader from '@/components/ProfessionalHeader';
import TransactionsTable from '@/components/TransactionsTable';
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
      const response = await fetch('/api/transactions/stats');

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-[url('/grid.svg')] bg-fixed">
      <ProfessionalHeader user={user} onSignOut={handleSignOut} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Transaction History
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 text-lg">
              Complete record of your trading activity
            </p>
          </div>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Transactions
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Transactions */}
          <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-16 h-16 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Transactions</p>
            {loadingStats ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
            ) : (
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {stats?.totalTransactions || 0}
              </p>
            )}
          </div>

          {/* Total Buys */}
          <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-16 h-16 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Buys</p>
            {loadingStats ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
            ) : (
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {stats?.totalBuys || 0}
              </p>
            )}
          </div>

          {/* Total Sells */}
          <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-16 h-16 text-rose-600 dark:text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Sells</p>
            {loadingStats ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
            ) : (
              <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {stats?.totalSells || 0}
              </p>
            )}
          </div>

          {/* Net Realized Gains */}
          <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-16 h-16 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Net Realized Gains</p>
            {loadingStats ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
            ) : (
              <p className={`text-2xl font-bold mt-1 truncate ${(stats?.totalRealizedGains || 0) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
                }`}>
                {(stats?.totalRealizedGains || 0) >= 0 ? '+' : ''}
                {formatCurrency(stats?.totalRealizedGains || 0)}
              </p>
            )}
          </div>

          {/* Total CGT Paid */}
          <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-16 h-16 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total CGT Paid</p>
            {loadingStats ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
            ) : (
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1 truncate">
                {formatCurrency(stats?.totalCGTPaid || 0)}
              </p>
            )}
          </div>
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
