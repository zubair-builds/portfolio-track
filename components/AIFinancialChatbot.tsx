'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Stock } from '../lib/portfolioData';

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
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message and context if provided
  useEffect(() => {
    if (isOpen && messages.length === 0) {
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

      setMessages([{
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, initialContext, stocks.length]);

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
          <div className="w-full max-w-md h-full flex flex-col shadow-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-slate dark:prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
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

              {error && (
                <div className="flex justify-start">
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg px-4 py-2">
                    <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your portfolio, stocks, or market..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

