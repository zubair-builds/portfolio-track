'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSymbolSearch, SearchSymbol } from '../hooks/useSymbolSearch';

export default function HeaderSymbolSearch() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, loading, error } = useSymbolSearch(inputValue, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleSelectSymbol = (symbol: SearchSymbol) => {
    setInputValue('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && e.key !== 'Escape') {
      if (inputValue.trim()) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          // Navigate to the selected symbol
          router.push(`/symbol/${results[selectedIndex].symbol}`);
          handleSelectSymbol(results[selectedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        setInputValue('');
        break;
    }
  };

  // Highlight matching text in results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={dropdownRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim()) {
              setIsOpen(true);
            }
          }}
          placeholder="Search"
          className="w-full rounded-lg border border-slate-300 px-4 py-2 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          autoComplete="off"
        />
        
        {/* Search Icon or Loading Spinner */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && inputValue.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 max-h-80 overflow-hidden">
          {error ? (
            <div className="p-4 text-sm text-rose-600 dark:text-rose-400">
              {error.message}
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
              No symbols found matching "{inputValue}"
            </div>
          ) : (
            <div className="overflow-y-auto max-h-80">
              {results.map((symbol, index) => (
                <Link
                  key={symbol.symbol}
                  href={`/symbol/${symbol.symbol}`}
                  onClick={() => handleSelectSymbol(symbol)}
                  className={`block w-full text-left px-4 py-3 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                    index === selectedIndex
                      ? 'bg-indigo-50 dark:bg-indigo-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {highlightMatch(symbol.symbol, inputValue)}
                        </span>
                        {symbol.isETF && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            ETF
                          </span>
                        )}
                        {symbol.isGEM && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            GEM
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {highlightMatch(symbol.name, inputValue)}
                      </p>
                      {symbol.sectorName && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                          {highlightMatch(symbol.sectorName, inputValue)}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {symbol.currentPrice ? (
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          ₨{symbol.currentPrice.toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          No price
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              
              {loading && (
                <div className="p-4 text-center">
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

