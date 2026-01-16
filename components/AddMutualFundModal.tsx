'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Modal } from './ui/Modal';

interface MutualFund {
  _id?: string;
  fundCode: string;
  fundName: string;
  amc?: string;
  category?: string;
  sector?: string;
  rating?: string;
  benchmark?: string;
  currentNAV?: number;
  lastNAVUpdate?: Date;
}

interface AddMutualFundModalProps {
  onClose: () => void;
  onSave: (data: {
    fundCode: string;
    fundName: string;
    totalUnits: number;
    averageNAV: number;
    firstPurchaseDate?: Date;
    amc?: string;
    category?: string;
  }) => Promise<void>;
}

export default function AddMutualFundModal({ onClose, onSave }: AddMutualFundModalProps) {
  const [funds, setFunds] = useState<MutualFund[]>([]);
  const [loadingFunds, setLoadingFunds] = useState(true);
  const [selectedFundCode, setSelectedFundCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [totalUnits, setTotalUnits] = useState('');
  const [averageNAV, setAverageNAV] = useState('');
  const [firstPurchaseDate, setFirstPurchaseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch funds on mount
  useEffect(() => {
    const fetchFunds = async () => {
      try {
        setLoadingFunds(true);
        const response = await fetch('/api/mutual-funds/list?limit=1000');
        if (response.ok) {
          const data = await response.json();
          setFunds(data.funds || []);
        }
      } catch (error) {
        console.error('Error fetching funds:', error);
      } finally {
        setLoadingFunds(false);
      }
    };
    fetchFunds();
  }, []);

  // Get selected fund
  const selectedFund = funds.find(f => f.fundCode === selectedFundCode);

  // Filter funds based on search query
  const filteredFunds = funds.filter(fund =>
    fund.fundName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fund.fundCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (fund.amc && fund.amc.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 20); // Limit to 20 results for performance

  // Auto-populate fields when fund is selected
  useEffect(() => {
    if (selectedFund) {
      if (selectedFund.currentNAV && !averageNAV) {
        setAverageNAV(selectedFund.currentNAV.toString());
      }
    }
  }, [selectedFund, averageNAV]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  const handleFundSelect = (fundCode: string) => {
    setSelectedFundCode(fundCode);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFundCode) {
      setError('Please select a mutual fund');
      return;
    }

    const selectedFund = funds.find(f => f.fundCode === selectedFundCode);
    if (!selectedFund) {
      setError('Selected fund not found');
      return;
    }

    const unitsNum = Number(totalUnits);
    const navNum = Number(averageNAV);

    if (isNaN(unitsNum) || unitsNum <= 0) {
      setError('Total units must be a positive number');
      return;
    }

    if (isNaN(navNum) || navNum <= 0) {
      setError('Average NAV must be a positive number');
      return;
    }

    setSaving(true);
    try {
      const purchaseDateObj = firstPurchaseDate ? new Date(firstPurchaseDate) : undefined;
      await onSave({
        fundCode: selectedFund.fundCode,
        fundName: selectedFund.fundName,
        totalUnits: unitsNum,
        averageNAV: navNum,
        firstPurchaseDate: purchaseDateObj,
        amc: selectedFund.amc,
        category: selectedFund.category,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add mutual fund');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Mutual Fund"
      subtitle="Add a new mutual fund holding to your portfolio"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-200 dark:border-rose-800/50 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="group relative" ref={dropdownRef}>
              <label htmlFor="fundSelect" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Select Mutual Fund *
              </label>
              {loadingFunds ? (
                <div className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-base text-slate-500 dark:text-slate-400">
                  Loading funds...
                </div>
              ) : (
                <>
                  <div className="relative">
                    <input
                      id="fundSelect"
                      type="text"
                      required
                      value={selectedFund ? selectedFund.fundName : searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                        if (!e.target.value) {
                          setSelectedFundCode('');
                        }
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search and select a mutual fund..."
                      className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                      disabled={saving}
                    />
                    {selectedFund && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFundCode('');
                          setSearchQuery('');
                          setShowDropdown(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {showDropdown && (searchQuery || !selectedFund) && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredFunds.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          No funds found
                        </div>
                      ) : (
                        filteredFunds.map((fund) => (
                          <button
                            key={fund.fundCode}
                            type="button"
                            onClick={() => handleFundSelect(fund.fundCode)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                          >
                            <div className="font-medium text-slate-900 dark:text-slate-100">{fund.fundName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {fund.fundCode} {fund.amc && `• ${fund.amc}`} {fund.category && `• ${fund.category}`}
                            </div>
                            {fund.currentNAV && (
                              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                NAV: ₨ {fund.currentNAV.toLocaleString('en-PK', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {selectedFund && (
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <div><span className="font-medium">Code:</span> {selectedFund.fundCode}</div>
                        {selectedFund.amc && <div><span className="font-medium">AMC:</span> {selectedFund.amc}</div>}
                        {selectedFund.category && <div><span className="font-medium">Category:</span> {selectedFund.category}</div>}
                        {selectedFund.currentNAV && (
                          <div>
                            <span className="font-medium">Current NAV:</span> ₨ {selectedFund.currentNAV.toLocaleString('en-PK', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="group">
              <label htmlFor="totalUnits" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Total Units *
              </label>
              <input
                id="totalUnits"
                type="number"
                required
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                placeholder="e.g., 1000.5"
                min="0.0001"
                step="0.0001"
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                disabled={saving}
              />
            </div>

            <div className="group">
              <label htmlFor="averageNAV" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Average NAV (₨) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">₨</span>
                <input
                  id="averageNAV"
                  type="number"
                  required
                  value={averageNAV}
                  onChange={(e) => setAverageNAV(e.target.value)}
                  placeholder="e.g., 125.50"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 pl-10 pr-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="group">
              <label htmlFor="firstPurchaseDate" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                First Purchase Date
              </label>
              <input
                id="firstPurchaseDate"
                type="date"
                value={firstPurchaseDate}
                onChange={(e) => setFirstPurchaseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Mutual Fund
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}


