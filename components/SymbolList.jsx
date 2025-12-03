'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { Card, CardContent } from './ui/Card';

export default function SymbolList({ symbols }) {
  // Handle both direct array and nested data structure
  const symbolsArray = useMemo(() => symbols.split(',').map(s => s.trim()), [symbols]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter symbols based on search term
  const filteredSymbols = useMemo(() => {
    if (!searchTerm.trim()) {
      return symbolsArray;
    }

    const term = searchTerm.toLowerCase().trim();
    return symbolsArray.filter((symbolData) => {
      const symbol = typeof symbolData === 'string' ? symbolData : symbolData.symbol || '';
      const name = typeof symbolData === 'object' ? symbolData.name || '' : '';
      const sectorName = typeof symbolData === 'object' ? symbolData.sectorName || '' : '';

      return (
        symbol.toLowerCase().includes(term) ||
        name.toLowerCase().includes(term) ||
        sectorName.toLowerCase().includes(term)
      );
    });
  }, [symbolsArray, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Featured Symbols
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {filteredSymbols.length} of {symbolsArray.length} symbols
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by symbol, name, or sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary-400 dark:focus:border-primary-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSymbols.length > 0 ? (
          filteredSymbols.map((symbolData, index) => {
            // Handle both string and object formats
            const symbol = typeof symbolData === 'string' ? symbolData : symbolData.symbol;
            const name = typeof symbolData === 'object' ? symbolData.name : null;
            const sectorName = typeof symbolData === 'object' ? symbolData.sectorName : null;
            const isETF = typeof symbolData === 'object' ? symbolData.isETF : false;
            const isDebt = typeof symbolData === 'object' ? symbolData.isDebt : false;

            return (
              <Link href={`/symbol/${symbol}`} key={symbol}>
                <Card variant="default" className="group hover:shadow-lg transition-all duration-150 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
                        <span className="text-white font-bold text-lg">
                          {symbol.charAt(0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                          #{index + 1}
                        </div>
                        <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-150">
                        {symbol}
                      </h3>
                      {name && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium line-clamp-2">
                          {name}
                        </p>
                      )}
                      {sectorName && (
                        <p className="text-slate-500 dark:text-slate-500 text-xs">
                          {sectorName}
                        </p>
                      )}
                    </div>

                    {/* Type indicators */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {isETF && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          ETF
                        </span>
                      )}
                      {isDebt && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                          Debt
                        </span>
                      )}
                      {!isETF && !isDebt && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          Equity
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active</span>
                      </div>
                      <div className="text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-150">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-slate-400 dark:text-slate-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No symbols found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try searching with different keywords or check your spelling.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
              Search by symbol, company name, or sector name.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
