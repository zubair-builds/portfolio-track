'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfessionalHeader from '@/components/ProfessionalHeader';
import TransactionsTable from '@/components/TransactionsTable';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/AuthProvider';
import TransactionUploadModal from '@/components/TransactionUploadModal';
import TransactionStatsCards, { TransactionStats } from '@/components/TransactionStatsCards';

export default function TransactionsClient() {
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

    const handleSignOut = async () => {
        await signout();
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
                <TransactionStatsCards stats={stats} loading={loadingStats} />

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
