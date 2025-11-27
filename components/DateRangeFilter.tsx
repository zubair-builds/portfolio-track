/**
 * DateRangeFilter Component
 * Provides preset and custom date range selection for transaction filtering
 */

'use client';

import React, { useState } from 'react';
import { Button } from './ui/Button';

export type DateRangePreset = 
  | 'thisMonth' 
  | 'last3Months' 
  | 'thisYear' 
  | 'lastYear' 
  | 'ytd' 
  | 'allTime' 
  | 'custom';

export interface DateRangeValue {
  startDate: Date | null;
  endDate: Date | null;
  preset: DateRangePreset;
  label: string;
}

interface DateRangeFilterProps {
  value?: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'ytd', label: 'YTD' },
  { value: 'allTime', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

function getDateRangeForPreset(preset: DateRangePreset): { startDate: Date | null; endDate: Date | null } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  switch (preset) {
    case 'thisMonth': {
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      return { startDate: start, endDate: end };
    }
    case 'last3Months': {
      const start = new Date(currentYear, currentMonth - 3, 1);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      return { startDate: start, endDate: end };
    }
    case 'thisYear': {
      const start = new Date(currentYear, 0, 1);
      const end = new Date(currentYear, 11, 31, 23, 59, 59);
      return { startDate: start, endDate: end };
    }
    case 'lastYear': {
      const start = new Date(currentYear - 1, 0, 1);
      const end = new Date(currentYear - 1, 11, 31, 23, 59, 59);
      return { startDate: start, endDate: end };
    }
    case 'ytd': {
      const start = new Date(currentYear, 0, 1);
      const end = now;
      return { startDate: start, endDate: end };
    }
    case 'allTime': {
      return { startDate: null, endDate: null };
    }
    case 'custom': {
      return { startDate: null, endDate: null };
    }
    default:
      return { startDate: null, endDate: null };
  }
}

export default function DateRangeFilter({ value, onChange, className = '' }: DateRangeFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(value?.preset || 'allTime');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  const handlePresetClick = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    
    if (preset === 'custom') {
      setShowCustomInputs(true);
      return;
    }
    
    setShowCustomInputs(false);
    const range = getDateRangeForPreset(preset);
    const presetLabel = PRESETS.find(p => p.value === preset)?.label || preset;
    
    onChange({
      startDate: range.startDate,
      endDate: range.endDate,
      preset,
      label: presetLabel,
    });
  };

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) {
      alert('Please select both start and end dates');
      return;
    }
    
    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59); // End of day
    
    if (startDate > endDate) {
      alert('Start date must be before end date');
      return;
    }
    
    onChange({
      startDate,
      endDate,
      preset: 'custom',
      label: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    });
  };

  const handleReset = () => {
    setSelectedPreset('allTime');
    setShowCustomInputs(false);
    setCustomStart('');
    setCustomEnd('');
    handlePresetClick('allTime');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.value}
            variant={selectedPreset === preset.value ? 'primary' : 'secondary'}
            onClick={() => handlePresetClick(preset.value)}
            className="text-sm"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      {showCustomInputs && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              From:
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              To:
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleApplyCustomRange}
              className="text-sm"
            >
              Apply
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
              className="text-sm"
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Current Selection Display */}
      {value && value.preset !== 'allTime' && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <span className="font-medium">Selected Range:</span> {value.label}
        </div>
      )}
    </div>
  );
}
