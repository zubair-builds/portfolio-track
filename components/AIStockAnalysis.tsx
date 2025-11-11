'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface AIStockAnalysisProps {
  symbol: string;
}

export function AIStockAnalysis({ symbol }: AIStockAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheDate, setCacheDate] = useState<string | null>(null);

  const fetchAnalysis = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setAnalysis('');
    setCacheDate(null);

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'stock',
          symbol: symbol,
          forceRefresh,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Check if response is cached
      const isCached = response.headers.get('X-Cache-Hit') === 'true';
      if (isCached) {
        const cacheDateHeader = response.headers.get('X-Cache-Date');
        if (cacheDateHeader) {
          setCacheDate(new Date(cacheDateHeader).toLocaleString());
        }
      }

      // Read stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          fullText += chunk;
          setAnalysis(fullText);
        }
      }
    } catch (err: any) {
      console.error('Error fetching AI analysis:', err);
      setError(err.message || 'Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading && !error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            AI-Powered Analysis
          </h3>
        </div>
        
        <div className="text-center py-8">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Get comprehensive AI-powered analysis for {symbol}
          </p>
          <Button
            onClick={() => fetchAnalysis(false)}
            variant="primary"
            className="flex items-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Analysis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            AI-Powered Analysis
          </h3>
          {cacheDate && (
            <Badge variant="neutral" className="text-xs">
              Cached: {cacheDate}
            </Badge>
          )}
        </div>
        <Button
          onClick={() => fetchAnalysis(true)}
          disabled={loading}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {loading ? 'Generating...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <p className="font-medium">Failed to generate analysis</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {loading && !analysis && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4 dark:border-indigo-900 dark:border-t-indigo-400" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
              Analyzing {symbol}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Generating comprehensive insights...
            </p>
          </div>
        </div>
      )}

      {analysis && (
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {analysis}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

