'use client';

import { useState } from 'react';
import { Button } from './ui/Button';

const SymbolToolbar = ({ onFilterChange, activeFilter = 'all' }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'gainers', label: 'Gainers' },
    { key: 'losers', label: 'Losers' },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-150"
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onFilterChange?.(filter.key)}
            className="min-w-0"
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SymbolToolbar;
