'use client';

import { useState } from 'react';
import { TimeRange } from '../hooks/usePriceHistory';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
  onCustomRangeApply?: (startDate: string, endDate: string) => void;
  dataRange?: {
    oldest: Date | null;
    newest: Date | null;
  };
  disabled?: boolean;
}

const ranges: Array<{ value: TimeRange; label: string; description: string }> = [
  { value: '1m', label: '1M', description: '1 Month' },
  { value: '6m', label: '6M', description: '6 Months' },
  { value: '1y', label: '1Y', description: '1 Year' },
  { value: '5y', label: '5Y', description: '5 Years' },
  { value: 'custom', label: 'Custom', description: 'Custom Date Range' },
];

export default function TimeRangeSelector({
  selected,
  onChange,
  onCustomRangeApply,
  dataRange,
  disabled = false,
}: TimeRangeSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const isRangeAvailable = (range: TimeRange): boolean => {
    if (!dataRange?.oldest) return true; // Assume available if no data range provided
    
    const now = new Date();
    const oldestDate = new Date(dataRange.oldest);
    const monthsAvailable = (now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    switch (range) {
      case '1m':
        return monthsAvailable >= 1;
      case '6m':
        return monthsAvailable >= 6;
      case '1y':
        return monthsAvailable >= 12;
      case '5y':
        return monthsAvailable >= 60;
      case 'custom':
        return true;
      default:
        return true;
    }
  };

  const handleCustomClick = () => {
    if (selected === 'custom') {
      setShowCustomPicker(!showCustomPicker);
    } else {
      setShowCustomPicker(true);
      // Set default dates if not set
      if (!startDate && dataRange?.oldest) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        setStartDate(oneMonthAgo.toISOString().split('T')[0]);
      }
      if (!endDate) {
        setEndDate(new Date().toISOString().split('T')[0]);
      }
    }
  };

  const handleApplyCustomRange = () => {
    setError('');
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      setError('Start date must be before end date');
      return;
    }

    if (dataRange?.oldest && start < new Date(dataRange.oldest)) {
      setError('Start date is before available data');
      return;
    }

    if (dataRange?.newest && end > new Date(dataRange.newest)) {
      setError('End date is after available data');
      return;
    }

    if (onCustomRangeApply) {
      onCustomRangeApply(startDate, endDate);
      setShowCustomPicker(false);
    }
  };

  const formatDateForInput = (date: Date | string | null) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {ranges.map((range) => {
          const available = isRangeAvailable(range.value);
          const isSelected = selected === range.value;
          
          if (range.value === 'custom') {
            return (
              <button
                key={range.value}
                onClick={() => !disabled && handleCustomClick()}
                disabled={disabled}
                title={range.description}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1
                  ${isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {range.label}
                <svg className={`w-4 h-4 transition-transform ${showCustomPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            );
          }
          
          return (
            <button
              key={range.value}
              onClick={() => !disabled && available && onChange(range.value)}
              disabled={disabled || !available}
              title={!available ? `Not enough data for ${range.description}` : range.description}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${isSelected
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }
                ${(disabled || !available)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
                }
              `}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={dataRange?.oldest ? formatDateForInput(dataRange.oldest) : undefined}
                max={endDate || (dataRange?.newest ? formatDateForInput(dataRange.newest) : undefined)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || (dataRange?.oldest ? formatDateForInput(dataRange.oldest) : undefined)}
                max={dataRange?.newest ? formatDateForInput(dataRange.newest) : undefined}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleApplyCustomRange}
              disabled={!startDate || !endDate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Apply
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

