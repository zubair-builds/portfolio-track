'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Stock } from '../lib/portfolioData';

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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <Card
        className="w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="flex flex-col h-full p-0">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                AI Insights
              </h2>
              {initialStock && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Analyzing {initialStock.symbol}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {mode && (
                <button
                  onClick={toggleHistory}
                  className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {showHistory ? 'Hide History' : 'View History'}
                </button>
              )}
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* History Panel */}
            {showHistory && (
              <div className="mb-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Previous Analyses
                </h3>
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
                            {item.portfolioSymbols && item.portfolioSymbols.length > 0 && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                {item.portfolioSymbols.length} stocks
                              </p>
                            )}
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

            {/* Mode Selection */}
            {!mode && !loading && (
              <div className="space-y-4 flex flex-col items-center justify-center min-h-full">
              <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
                Choose what insights you'd like to generate:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                <button
                  onClick={() => fetchInsights('portfolio')}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50 transition dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30"
                >
                  <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Portfolio Review</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Comprehensive analysis by AI consultant
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => fetchInsights('market')}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30"
                >
                  <svg className="w-12 h-12 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Market Trends</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      PSX overview & sentiment
                    </p>
                  </div>
                </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && !content && (
              <div className="flex flex-col items-center justify-center gap-4 min-h-full">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
                <p className="text-slate-600 dark:text-slate-400">Generating insights...</p>
              </div>
            )}

            {/* Content Display */}
            {(content || error) && (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                {error ? (
                  <div className="text-rose-600 dark:text-rose-400">
                    <p className="font-semibold mb-2">Error:</p>
                    <p>{error}</p>
                  </div>
                ) : (
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
                      {content}
                    </ReactMarkdown>
                    {loading && (
                      <span className="inline-block w-2 h-4 bg-indigo-600 dark:bg-indigo-400 animate-pulse ml-1" />
                    )}
                    <div ref={contentEndRef} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons - Fixed Footer */}
          {(content || error) && (
            <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

