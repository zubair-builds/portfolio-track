'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfessionalHeader from '@/components/ProfessionalHeader';
import IndicesTable from '@/components/IndicesTable';
import { useAuth } from '@/components/AuthProvider';
import { sortIndicesByPriority } from '@/lib/constants';

export interface IndexData {
  symbol: string;
  name: string;
  description?: string;
  symbolCount?: number;
  updateFrequency?: string;
  latestPrice?: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    trades: number;
    value: number;
    high: number;
    low: number;
    timestamp: string;
    marketState?: string;
  };
  lastUpdated?: string;
}

export default function IndicesPage() {
  const router = useRouter();
  const { user, initializing, signout } = useAuth();
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIndices();
  }, []);

  const fetchIndices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/indices');
      if (response.ok) {
        const data = await response.json();
        const sortedIndices = sortIndicesByPriority<IndexData>(data.indices || []);
        setIndices(sortedIndices);
      } else {
        console.error('Failed to fetch indices');
      }
    } catch (error) {
      console.error('Error fetching indices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signout();
    router.replace('/signin');
  };

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/signin');
    }
  }, [initializing, user, router]);

  if (initializing) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ProfessionalHeader user={user} onSignOut={handleSignOut} />

      <main className="container mx-auto max-w-7xl py-8 px-4 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Market Indices
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Browse all PSX indices
          </p>
        </div>
        <IndicesTable
          indices={indices}
          loading={loading}
        />
      </main>
    </div>
  );
}
