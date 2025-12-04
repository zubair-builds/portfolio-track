'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './ui/Button';
import { Stock } from '../lib/portfolioData';
import { Modal } from './ui/Modal';

interface AIInsightsModalProps {
  stocks: Stock[];
  onClose: () => void;
  initialStock?: Stock;
}

interface AnalysisHistoryItem {
  _id: string;
  symbol: string;
  mode: string;
  createdAt: Date;
  portfolioSymbols?: string[];
}

export default function AIInsightsModal({ stocks, onClose, initialStock }: AIInsightsModalProps) {
  const [mode, setMode] = useState<'portfolio' | 'market' | 'stock' | null>(initialStock ? 'stock' : null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [content]);

  useEffect(() => {
    if (initialStock) {
      fetchInsights('stock', initialStock.symbol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchInsights = async (insightMode: 'portfolio' | 'market' | 'stock', stockSymbol?: string, forceRefresh = false) => {
    setMode(insightMode);
    setContent('');
    setError(null);
    setLoading(true);
    setIsCached(false);

    abortControllerRef.current = new AbortController();

    try {
      const requestBody: {
        stocks: Stock[];
        mode: string;
        symbol?: string;
        forceRefresh?: boolean;
        investmentData?: { shares: number; avgBuy: number; currentPrice: number };
      } = {
        stocks,
        mode: insightMode,
        forceRefresh,
      };

      if (insightMode === 'stock' && stockSymbol) {
        requestBody.symbol = stockSymbol;

        // If analyzing a specific stock and user owns it, pass investment data
        if (initialStock && initialStock.symbol === stockSymbol) {
          requestBody.investmentData = {
            shares: initialStock.shares,
            avgBuy: initialStock.avgBuy,
            currentPrice: initialStock.currentPrice,
          };
        }
      }

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch insights.' }));
        throw new Error(errorData.error || 'Failed to fetch insights.');
      }

      if (!response.body) {
        throw new Error('No response body received.');
      }

      // Check if response is from cache
      const cacheHit = response.headers.get('X-Cache-Hit') === 'true';
      setIsCached(cacheHit);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setContent((prev) => prev + chunk);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('Request aborted');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      if (mode) params.append('mode', mode);
      if (initialStock) params.append('symbol', initialStock.symbol);
      params.append('limit', '20');

      const response = await fetch(`/api/ai/history?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.history.map((item: Record<string, unknown>) => ({
          ...item,
          createdAt: new Date(item.createdAt as string),
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
    setContent('');
    try {
      const response = await fetch(`/api/ai/history?id=${id}`);
      const data = await response.json();

      if (data.success && data.analysis) {
        setContent(data.analysis.content);
        setMode(data.analysis.mode);
        setIsCached(true);
        setShowHistory(false);
      } else {
        setError('Failed to load historical analysis');
      }
    } catch {
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

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title="AI Insights"
      subtitle={initialStock ? `Analyzing ${initialStock.symbol}` : 'Portfolio & Market Analysis'}
      headerContent={
        mode && (
          <button
            onClick={toggleHistory}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showHistory ? 'Hide History' : 'History'}
          </button>
        )
      }
    >
      <div className="space-y-6">
        {/* History Panel */}
        {showHistory && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
              Previous Analyses
            </h3>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900/30 dark:border-t-indigo-400" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No previous analyses found
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {history.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => loadHistoricalAnalysis(item._id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                            {item.mode}
                          </span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {item.symbol}
                          </span>
                        </div>
                        {item.portfolioSymbols && item.portfolioSymbols.length > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate pl-1">
                            {item.portfolioSymbols.length} stocks analyzed
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mode Selection */}
        {!mode && !loading && (
          <div className="py-8 flex flex-col items-center justify-center">
            <p className="text-center text-slate-600 dark:text-slate-400 mb-8 text-lg">
              Choose what insights you&apos;d like to generate:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
              <button
                onClick={() => fetchInsights('portfolio')}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-slate-100 bg-white hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
              >
                <div className="p-4 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Portfolio Review</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Comprehensive analysis by AI consultant
                  </p>
                </div>
              </button>
              <button
                onClick={() => fetchInsights('market')}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-slate-100 bg-white hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500"
              >
                <div className="p-4 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Market Trends</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    PSX overview & sentiment analysis
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !content && (
          <div className="flex flex-col items-center justify-center gap-6 py-12">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900/30 dark:border-t-indigo-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-slate-900 dark:text-slate-100">Generating Insights</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Analyzing data points and market trends...</p>
            </div>
          </div>
        )}

        {/* Content Display */}
        {(content || error) && (
          <div className="space-y-6">
            {error ? (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-6 text-center">
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-2">Analysis Failed</h3>
                <p className="text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-base prose-p:leading-relaxed prose-li:marker:text-indigo-600 dark:prose-li:marker:text-indigo-400 prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-slate-900 dark:text-white" {...props} />,
                    h2: ({ ...props }) => <h2 className="text-xl font-bold mt-5 mb-3 text-slate-800 dark:text-slate-100" {...props} />,
                    h3: ({ ...props }) => <h3 className="text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200" {...props} />,
                    h4: ({ ...props }) => <h4 className="text-base font-bold mt-3 mb-2 text-slate-700 dark:text-slate-300" {...props} />,
                    p: ({ ...props }) => <p className="mb-3 leading-relaxed text-slate-700 dark:text-slate-300" {...props} />,
                    ul: ({ ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
                    ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
                    li: ({ ...props }) => <li className="mb-1" {...props} />,
                    blockquote: ({ ...props }) => (
                      <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 my-4 bg-slate-50 dark:bg-slate-800/50 italic text-slate-700 dark:text-slate-300 rounded-r" {...props} />
                    ),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    code: ({ inline, children, ...props }: any) =>
                      inline ? (
                        <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                      ) : (
                        <code className="block bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props}>{children}</code>
                      ),
                    table: ({ ...props }) => (
                      <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700" {...props} />
                      </div>
                    ),
                    th: ({ ...props }) => (
                      <th className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" {...props} />
                    ),
                    td: ({ ...props }) => (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700" {...props} />
                    ),
                    a: ({ ...props }) => (
                      <a className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
                {loading && (
                  <span className="inline-block w-2 h-4 bg-indigo-600 dark:bg-indigo-400 animate-pulse ml-1" />
                )}
                <div ref={contentEndRef} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              {!loading && isCached && mode && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (mode === 'stock' && initialStock) {
                      fetchInsights('stock', initialStock.symbol, true);
                    } else {
                      fetchInsights(mode, undefined, true);
                    }
                  }}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Analysis
                </Button>
              )}
              {!loading && !initialStock && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMode(null);
                    setContent('');
                    setError(null);
                    setIsCached(false);
                  }}
                  className="flex-1"
                >
                  Generate New Insight
                </Button>
              )}
              <Button variant="primary" onClick={handleClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
