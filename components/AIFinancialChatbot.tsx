'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Stock } from '../lib/portfolioData';
import { useAuth } from './AuthProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIFinancialChatbotProps {
  stocks?: Stock[];
  initialContext?: {
    symbol?: string;
    mode?: 'portfolio' | 'market' | 'stock';
  };
}

export default function AIFinancialChatbot({ stocks = [], initialContext }: AIFinancialChatbotProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const historyLoadedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const showWelcomeMessage = useCallback(() => {
    setMessages(prevMessages => {
      if (prevMessages.length === 0) {
        let welcomeMessage = "Hello! I'm your AI financial assistant. I can help you with:\n\n";
        welcomeMessage += "• Portfolio analysis and recommendations\n";
        welcomeMessage += "• Stock symbol analysis\n";
        welcomeMessage += "• Market trends and outlook\n";
        welcomeMessage += "• Investment advice and risk assessment\n\n";
        welcomeMessage += "What would you like to know?";

        if (initialContext?.symbol) {
          welcomeMessage += `\n\n*I see you're viewing ${initialContext.symbol}. Feel free to ask me about it!*`;
        } else if (initialContext?.mode === 'portfolio' && stocks.length > 0) {
          welcomeMessage += `\n\n*I can see your portfolio with ${stocks.length} holdings. Ask me to analyze it!*`;
        }

        return [{
          role: 'assistant' as const,
          content: welcomeMessage,
          timestamp: new Date(),
        }];
      }
      return prevMessages;
    });
  }, [initialContext, stocks.length]);

  // Fetch chat history when chatbot opens
  useEffect(() => {
    if (isOpen && !historyLoadedRef.current && user?.email) {
      setLoadingHistory(true);
      fetch('/api/ai/chat/history')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages && data.messages.length > 0) {
            // Convert fetched messages to Message format
            const fetchedMessages: Message[] = data.messages.map((msg: { role: 'user' | 'assistant'; content: string; timestamp?: string }) => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            }));
            setMessages(fetchedMessages);
            historyLoadedRef.current = true;
          } else {
            // No history found, show welcome message
            showWelcomeMessage();
          }
        })
        .catch(err => {
          console.error('Error fetching chat history:', err);
          // On error, show welcome message
          showWelcomeMessage();
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    } else if (isOpen && !user?.email) {
      // User not authenticated, show welcome message
      showWelcomeMessage();
    }
  }, [isOpen, user?.email, showWelcomeMessage]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'chat',
          message: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stocks: stocks,
          context: initialContext,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response.' }));
        throw new Error(errorData.error || 'Failed to get response.');
      }

      if (!response.body) {
        throw new Error('No response body received.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: assistantContent,
          };
          return updated;
        });
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('Request aborted');
        } else {
          setError(err.message);
          setMessages(prev => prev.slice(0, -1)); // Remove incomplete assistant message
        }
      } else {
        setError('An unexpected error occurred.');
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setError(null);
    historyLoadedRef.current = false;
    // Show welcome message after clearing
    showWelcomeMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
          aria-label="Open AI Chatbot"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar */}
          <div className="w-full max-w-3xl h-full flex flex-col shadow-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="font-semibold">AI Financial Assistant</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearConversation}
                  className="p-1.5 hover:bg-indigo-700 rounded transition"
                  title="Clear conversation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-indigo-700 rounded transition"
                  title="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50 dark:bg-slate-950">
              {loadingHistory && (
                <div className="flex justify-center items-center py-8">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    <span className="ml-2 text-sm">Loading chat history...</span>
                  </div>
                </div>
              )}
              {!loadingHistory && messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg px-5 py-3 ${message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                      }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-slate dark:prose-invert prose-base max-w-none leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="ml-4">{children}</li>,
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            code: ({ children }) => <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                            pre: ({ children }) => <pre className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {!loadingHistory && loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 rounded-lg px-4 py-2 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}

              {!loadingHistory && error && (
                <div className="flex justify-start">
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg px-4 py-2">
                    <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your portfolio, stocks, or market..."
                  className="flex-1 px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  rows={2}
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

