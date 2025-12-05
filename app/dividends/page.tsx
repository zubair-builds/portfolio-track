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
import DividendStatsCards from '@/components/DividendStatsCards';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import DividendBreakdownTable from '@/components/DividendBreakdownTable';

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
      console.log('Fetching financial stats...');
      const response = await fetch('/api/dividends/stats');
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Financial stats data:', data);
        if (data.success && data.stats) {
          setFinancialStats({
            totalNetDividend: data.stats.totalNet,
            totalGrossDividend: data.stats.totalGross,
            totalTaxDeducted: data.stats.totalTax,
            totalZakatDeducted: data.stats.totalZakat,
            count: data.stats.count
          });
        } else {
          console.error('API returned success: false or missing stats', data);
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
          <DividendStatsCards stats={financialStats} />
        )}

        {/* Symbol Breakdown */}
        {symbolStats.length > 0 && (
          <DividendBreakdownTable
            stats={symbolStats}
            onToggleExpand={toggleExpand}
            expandedSymbol={expandedSymbol}
            symbolDetails={symbolDetails}
          />
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
