'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface AIStockAnalysisProps {
  symbol: string;
  investmentData?: {
    shares: number;
    avgBuy: number;
    currentPrice: number;
  };
}

interface AnalysisHistoryItem {
  _id: string;
  symbol: string;
  mode: string;
  createdAt: Date;
}

export function AIStockAnalysis({ symbol, investmentData }: AIStockAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheDate, setCacheDate] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
          stocks: [],
          investmentData: investmentData || undefined,
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

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      params.append('mode', 'stock');
      params.append('symbol', symbol);
      params.append('limit', '20');

      const response = await fetch(`/api/ai/history?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.history.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
        })));
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadHistoricalAnalysis = async (id: string) => {
    setLoading(true);
    setError(null);
    setAnalysis('');
    try {
      const response = await fetch(`/api/ai/history?id=${id}`);
      const data = await response.json();

      if (data.success && data.analysis) {
        setAnalysis(data.analysis.content);
        setCacheDate(new Date(data.analysis.createdAt).toLocaleString());
        setShowHistory(false);
      } else {
        setError('Failed to load historical analysis');
      }
    } catch (err) {
      setError('Error loading historical analysis');
    } finally {
      setLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory && history.length === 0) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
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
        <div className="flex items-center gap-2">
          {analysis && (
            <Button
              onClick={toggleHistory}
              disabled={loading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showHistory ? 'Hide History' : 'View History'}
            </Button>
          )}
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
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-4">
          <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Previous Analyses
          </h4>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
              No previous analyses found
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((item) => (
                <button
                  key={item._id}
                  onClick={() => loadHistoricalAnalysis(item._id)}
                  className="w-full text-left p-3 rounded-lg hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                          {item.mode}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.symbol}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-base prose-p:leading-relaxed prose-li:marker:text-indigo-600 dark:prose-li:marker:text-indigo-400 prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h1 className="mt-6 mb-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="mt-6 mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="mt-4 mb-2" {...props} />,
                h4: ({ node, ...props }) => <h4 className="mt-4 mb-2" {...props} />,
                p: ({ node, ...props }) => <p className="mb-4" {...props} />,
                ul: ({ node, ...props }) => <ul className="mb-4 space-y-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="mb-4 space-y-2" {...props} />,
                li: ({ node, ...props }) => <li className="ml-4" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-4 text-slate-600 dark:text-slate-400" {...props} />
                ),
                code: ({ node, inline, ...props }: any) => 
                  inline ? (
                    <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                  ) : (
                    <code className="block bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props} />
                  ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-700" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th className="border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-left font-semibold" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-slate-300 dark:border-slate-700 px-4 py-2" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
                ),
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

