'use client';

import { TimeRange } from '../hooks/usePriceHistory';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
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
];

export default function TimeRangeSelector({
  selected,
  onChange,
  dataRange,
  disabled = false,
}: TimeRangeSelectorProps) {
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
      default:
        return true;
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ranges.map((range) => {
        const available = isRangeAvailable(range.value);
        const isSelected = selected === range.value;
        
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
  );
}

