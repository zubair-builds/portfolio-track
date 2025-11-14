'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://psxterminal.com/';
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

interface TickData {
  s: string; // symbol
  m: string; // market
  st: string; // market state
  c: number; // price (close)
  ch: number; // change
  pch: number; // changePercent
  v: number; // volume
  tr: number; // trades
  val: number; // value
  h: number; // high
  l: number; // low
  bp: number; // bid price
  ap: number; // ask price
  bv: number; // bid volume
  av: number; // ask volume
  t: number; // timestamp
}

interface TickUpdate {
  type: 'tickUpdate';
  symbol: string;
  market: string;
  tick: TickData;
  timestamp: number;
}

interface WelcomeMessage {
  type: 'welcome';
  message: string;
  clientId: string;
}

interface PingMessage {
  type: 'ping';
  timestamp: number;
}

interface SubscribeResponse {
  type: 'subscribeResponse';
  requestId?: string;
  status: string;
  subscriptionKey: string;
}

interface ErrorMessage {
  type: 'error';
  message: string;
  requestId?: string;
  timestamp: number;
}

type WebSocketMessage = TickUpdate | WelcomeMessage | PingMessage | SubscribeResponse | ErrorMessage;

interface MarketUpdate {
  symbol: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trades: number;
  value: number;
  high: number;
  low: number;
  bid: number;
  ask: number;
  bidVol: number;
  askVol: number;
  state: string;
  timestamp: number;
  receivedAt: Date;
}

interface LiveTickerProps {
  marketType?: string;
  autoConnect?: boolean;
  onConnectionStateChange?: (state: ConnectionState) => void;
  filteredSymbols?: string[]; // Only show updates for these symbols (optional - if not provided, shows all)
}

export default function LiveTicker({ marketType = 'REG', autoConnect = false, onConnectionStateChange, filteredSymbols = [] }: LiveTickerProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionKeyRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const [updates, setUpdates] = useState<MarketUpdate[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(autoConnect ? 'connecting' : 'disconnected');
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  // Use ref to store latest filteredSymbols so WebSocket handler always has current value
  const filteredSymbolsRef = useRef<string[]>(filteredSymbols);
  // Track latest update per symbol and insertion order for smooth scrolling
  const updatesMapRef = useRef<Map<string, MarketUpdate>>(new Map());
  const symbolOrderRef = useRef<string[]>([]);
  // Batch updates for database: Map<symbol, batchUpdateData>
  const batchUpdatesRef = useRef<Map<string, {
    symbol: string;
    currentPrice?: number;
    priceChange?: number;
    priceChangePercent?: number;
    volume?: number;
    trades?: number;
    value?: number;
    priceHigh?: number;
    priceLow?: number;
    bidPrice?: number;
    askPrice?: number;
    bidVolume?: number;
    askVolume?: number;
    lastFetchedAt?: number;
  }>>(new Map());
  const batchFlushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // ⚙️ BATCH FLUSH INTERVAL: Change this value to adjust how often updates are saved to database (in milliseconds)
  // Current: 30 seconds (30000ms). To change: update the value below.
  const BATCH_FLUSH_INTERVAL = 30000; // 30 seconds - Database update frequency

  // ⚙️ BATCH SIZE THRESHOLD: Safety valve to flush if too many unique symbols accumulate
  // Set to 0 to disable threshold-based flushing (recommended if time-based flushing is sufficient)
  // Set to a high number (100+) to act as a safety valve for unexpected bursts
  const BATCH_SIZE_THRESHOLD = 0; // Disabled - relies on time-based flushing only
  const flushBatchUpdatesRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const isDisconnectedRef = useRef(false);

  // Update ref whenever filteredSymbols prop changes
  useEffect(() => {
    filteredSymbolsRef.current = filteredSymbols;
  }, [filteredSymbols]);

  // Flush batch updates to database
  const flushBatchUpdates = useCallback(async () => {
    // Don't flush if disconnected
    if (isDisconnectedRef.current) {
      console.log('[LiveTicker] Skipping flush - connection is disconnected');
      return;
    }

    const batch = batchUpdatesRef.current;
    if (batch.size === 0) {
      // No updates to flush - this is normal if no updates received yet
      return;
    }

    // Convert Map to array of updates
    const updatesArray = Array.from(batch.values());
    const batchSize = updatesArray.length;

    console.log(`[LiveTicker] Flushing ${batchSize} symbol updates to database`);

    // Clear the batch before sending (so new updates can accumulate)
    batch.clear();

    try {
      const response = await fetch('/api/symbols/update-prices-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates: updatesArray }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[LiveTicker] Failed to flush batch updates:', errorData);
      } else {
        const result = await response.json().catch(() => ({}));
        console.log(`[LiveTicker] Successfully flushed ${result.updated || batchSize} updates to database`);
      }
    } catch (error) {
      console.error('[LiveTicker] Error flushing batch updates:', error);
      // Continue processing new updates even if batch fails
    }
  }, []);

  // Store flushBatchUpdates in ref so interval callback always has latest version
  useEffect(() => {
    flushBatchUpdatesRef.current = flushBatchUpdates;
  }, [flushBatchUpdates]);

  // Update parent component when connection state changes
  useEffect(() => {
    if (onConnectionStateChange) {
      onConnectionStateChange(connectionState);
    }
  }, [connectionState, onConnectionStateChange]);

  const getNextRequestId = useCallback(() => {
    return `req-${++requestIdRef.current}`;
  }, []);

  const sendPong = useCallback((timestamp: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'pong',
        timestamp
      }));
    }
  }, []);

  const unsubscribe = useCallback(() => {
    if (subscriptionKeyRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'unsubscribe',
          subscriptionKey: subscriptionKeyRef.current,
          requestId: getNextRequestId()
        }));
        subscriptionKeyRef.current = null;
      } catch (err) {
        console.error('Error unsubscribing:', err);
      }
    }
  }, [getNextRequestId]);

  const isManualDisconnectRef = useRef(false);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    // Clear reconnection attempts to prevent auto-reconnect
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear batch flush interval immediately
    if (batchFlushIntervalRef.current) {
      clearInterval(batchFlushIntervalRef.current);
      batchFlushIntervalRef.current = null;
      console.log('[LiveTicker] Cleared batch flush interval on disconnect');
    }

    // Flush any remaining batch updates before disconnecting (do this BEFORE setting disconnected flag)
    if (batchUpdatesRef.current.size > 0 && flushBatchUpdatesRef.current) {
      console.log(`[LiveTicker] Flushing ${batchUpdatesRef.current.size} remaining updates before disconnect`);
      // Flush synchronously - we're still connected at this point
      flushBatchUpdatesRef.current();
    }

    // NOW set disconnected flag to prevent any future flushes
    isDisconnectedRef.current = true;

    // Unsubscribe
    unsubscribe();

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
  }, [unsubscribe]);

  const connect = useCallback(() => {
    if ((wsRef.current?.readyState === WebSocket.OPEN) || (wsRef.current?.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Reset reconnection attempts and manual disconnect flag
    reconnectAttemptsRef.current = 0;
    isManualDisconnectRef.current = false;
    isDisconnectedRef.current = false; // Reset disconnected flag
    setConnectionState('connecting');
    setError(null);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;

        // Set up periodic batch flush interval
        // Ensure flushBatchUpdatesRef is set before creating interval
        if (!flushBatchUpdatesRef.current) {
          console.warn('[LiveTicker] flushBatchUpdatesRef not set yet, setting it now');
          flushBatchUpdatesRef.current = flushBatchUpdates;
        }

        console.log(`[LiveTicker] Setting up batch flush interval: ${BATCH_FLUSH_INTERVAL}ms (${BATCH_FLUSH_INTERVAL / 1000}s)`);
        console.log(`[LiveTicker] Current batch size: ${batchUpdatesRef.current.size} symbols`);

        // Clear any existing interval first
        if (batchFlushIntervalRef.current) {
          clearInterval(batchFlushIntervalRef.current);
        }

        batchFlushIntervalRef.current = setInterval(() => {
          // Check if disconnected before processing
          if (isDisconnectedRef.current) {
            console.log('[LiveTicker] Interval triggered but connection is disconnected, skipping flush');
            return;
          }

          const batchSize = batchUpdatesRef.current.size;
          console.log(`[LiveTicker] Interval triggered - batch size: ${batchSize} symbols`);

          if (flushBatchUpdatesRef.current) {
            flushBatchUpdatesRef.current();
          } else {
            console.error('[LiveTicker] ERROR: Interval triggered but flushBatchUpdatesRef.current is not set!');
            // Try to set it again as fallback
            flushBatchUpdatesRef.current = flushBatchUpdates;
            if (flushBatchUpdatesRef.current && batchSize > 0 && !isDisconnectedRef.current) {
              console.log('[LiveTicker] Retrying flush after setting ref');
              flushBatchUpdatesRef.current();
            }
          }
        }, BATCH_FLUSH_INTERVAL);

        // Subscribe to market data
        const requestId = getNextRequestId();
        ws.send(JSON.stringify({
          type: 'subscribe',
          subscriptionType: 'marketData',
          params: { marketType },
          requestId
        }));
      };

      ws.onmessage = (ev) => {
        try {
          const message = JSON.parse(ev.data) as WebSocketMessage;

          switch (message.type) {
            case 'welcome':
              const welcomeMsg = message as WelcomeMessage;
              setClientId(welcomeMsg.clientId);
              console.log('Welcome message received:', welcomeMsg.message, 'Client ID:', welcomeMsg.clientId);
              break;

            case 'ping':
              const pingMsg = message as PingMessage;
              sendPong(pingMsg.timestamp);
              break;

            case 'subscribeResponse':
              const subResponse = message as SubscribeResponse;
              if (subResponse.status === 'success') {
                subscriptionKeyRef.current = subResponse.subscriptionKey;
                console.log('Subscribed successfully:', subResponse.subscriptionKey);
              } else {
                setError(`Subscription failed: ${subResponse.status}`);
                setConnectionState('error');
              }
              break;

            case 'tickUpdate':
              const tickUpdate = message as TickUpdate;
              const tick = tickUpdate.tick;

              const symbol = (tick.s || tickUpdate.symbol || '').toUpperCase();
              // if (tickUpdate.market === 'IDX') {
              //   console.log('market:', tickUpdate.market);
              //   console.log('symbol:', tick.s);
              // }
              // Add to batch for database update (ALL symbols, not just filtered ones)
              // Filtering is only for display purposes
              const wasNewSymbol = !batchUpdatesRef.current.has(symbol);
              batchUpdatesRef.current.set(symbol, {
                symbol,
                currentPrice: tick.c,
                priceChange: tick.ch,
                priceChangePercent: tick.pch,
                volume: tick.v,
                trades: tick.tr,
                value: tick.val,
                priceHigh: tick.h,
                priceLow: tick.l,
                bidPrice: tick.bp,
                askPrice: tick.ap,
                bidVolume: tick.bv,
                askVolume: tick.av,
                lastFetchedAt: tick.t || tickUpdate.timestamp,
              });

              // Log batch status periodically (only for new symbols to avoid spam)
              if (wasNewSymbol && batchUpdatesRef.current.size % 10 === 0) {
                console.log(`[LiveTicker] Batch now contains ${batchUpdatesRef.current.size} unique symbols (will flush in ${BATCH_FLUSH_INTERVAL / 1000}s)`);
              }

              // Flush batch if it reaches threshold size (only if threshold is enabled)
              // With time-based flushing every 30 seconds, threshold flushing is usually not needed
              if (BATCH_SIZE_THRESHOLD > 0 && batchUpdatesRef.current.size >= BATCH_SIZE_THRESHOLD && flushBatchUpdatesRef.current) {
                flushBatchUpdatesRef.current();
              }

              // Use ref to get latest filteredSymbols (avoid closure issue)
              const currentFilter = filteredSymbolsRef.current;

              // Filter: Only process updates for symbols in filteredSymbols array (if provided)
              // This filtering is only for DISPLAY purposes, database gets all updates
              if (currentFilter && currentFilter.length > 0) {
                // Normalize filtered symbols to uppercase for comparison
                const normalizedFilter = currentFilter.map(s => s.toUpperCase());
                if (!normalizedFilter.includes(symbol)) {
                  // Skip display update but database update already happened above
                  break;
                }
              }
              // If no filter provided, show all updates

              const marketUpdate: MarketUpdate = {
                symbol,
                market: tick.m || tickUpdate.market,
                price: tick.c,
                change: tick.ch,
                changePercent: tick.pch,
                volume: tick.v,
                trades: tick.tr,
                value: tick.val,
                high: tick.h,
                low: tick.l,
                bid: tick.bp,
                ask: tick.ap,
                bidVol: tick.bv,
                askVol: tick.av,
                state: tick.st,
                timestamp: tick.t || tickUpdate.timestamp,
                receivedAt: new Date()
              };

              // Update latest value for this symbol in the map
              const wasNew = !updatesMapRef.current.has(symbol);
              updatesMapRef.current.set(symbol, marketUpdate);

              // Maintain stable insertion order (don't reorder on updates for smooth animation)
              if (wasNew) {
                symbolOrderRef.current.push(symbol);
                // Keep max 100 symbols
                if (symbolOrderRef.current.length > 100) {
                  const removedSymbol = symbolOrderRef.current.shift();
                  if (removedSymbol) {
                    updatesMapRef.current.delete(removedSymbol);
                  }
                }
              }
              // Don't reorder existing symbols - just update their values in place
              // This keeps the animation smooth

              // Convert map to array maintaining stable order
              const orderedUpdates = symbolOrderRef.current
                .map(sym => updatesMapRef.current.get(sym))
                .filter((update): update is MarketUpdate => update !== undefined);

              setUpdates(orderedUpdates);
              break;

            case 'error':
              const errorMsg = message as ErrorMessage;
              setError(errorMsg.message);
              setConnectionState('error');
              console.error('WebSocket error:', errorMsg.message);
              break;

            default:
              console.log('Unknown message type:', message);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setConnectionState('error');
        setError('Connection error occurred');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');
        subscriptionKeyRef.current = null;
        wsRef.current = null;

        // Set disconnected flag to prevent future flushes
        isDisconnectedRef.current = true;

        // Clear batch flush interval
        if (batchFlushIntervalRef.current) {
          clearInterval(batchFlushIntervalRef.current);
          batchFlushIntervalRef.current = null;
          console.log('[LiveTicker] Cleared batch flush interval in onclose handler');
        }

        // Flush any remaining batch updates before closing (only if not manually disconnected)
        // If manually disconnected, we already flushed in disconnect()
        if (!isManualDisconnectRef.current && batchUpdatesRef.current.size > 0 && flushBatchUpdatesRef.current) {
          // Temporarily allow flush for this final batch
          isDisconnectedRef.current = false;
          flushBatchUpdatesRef.current().finally(() => {
            isDisconnectedRef.current = true;
          });
        }

        // Only attempt reconnection if it wasn't a manual disconnect
        if (!isManualDisconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY
          );

          reconnectAttemptsRef.current++;
          setConnectionState('reconnecting');

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (!isManualDisconnectRef.current) {
          setError('Maximum reconnection attempts reached. Please refresh the page.');
        }

        // Reset manual disconnect flag after handling
        isManualDisconnectRef.current = false;
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setConnectionState('error');
      setError('Failed to create WebSocket connection');
    }
  }, [marketType, getNextRequestId, sendPong, flushBatchUpdates]);

  useEffect(() => {
    isMountedRef.current = true;

    if (autoConnect) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      // Cleanup on unmount or dependency change
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Clear batch flush interval
      if (batchFlushIntervalRef.current) {
        clearInterval(batchFlushIntervalRef.current);
        batchFlushIntervalRef.current = null;
      }

      // Flush any remaining batch updates
      if (batchUpdatesRef.current.size > 0 && flushBatchUpdatesRef.current) {
        flushBatchUpdatesRef.current();
      }

      unsubscribe();

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [autoConnect, connect, unsubscribe]);

  // Expose connect/disconnect methods via ref if needed, but for now we'll use state-based approach

  const getConnectionStatusColor = (): string => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'error':
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = (): string => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`;
      case 'error':
        return 'Error';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const formatNumber = (num: number): string => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatPrice = (price: number): string => {
    if (price === undefined || price === null || isNaN(price)) return 'N/A';
    return price.toFixed(2);
  };

  const handleToggleConnection = () => {
    if (connectionState === 'connected' || connectionState === 'connecting' || connectionState === 'reconnecting') {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="space-y-4 min-h-[100px] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${getConnectionStatusColor()}`}></div>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Live Ticker ({marketType})
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {getConnectionStatusText()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleConnection}
            disabled={connectionState === 'connecting' || connectionState === 'reconnecting'}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${connectionState === 'connected' || connectionState === 'reconnecting'
              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5`}
          >
            {connectionState === 'connected' || connectionState === 'reconnecting' ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start
              </>
            )}
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Ticker */}
      {updates.length > 0 && connectionState === 'connected' && (
        <>
          <style>{`
            @keyframes ticker-scroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-50%);
              }
            }
            .ticker-scroll-container {
              animation: ticker-scroll 30s linear infinite;
            }
            .ticker-scroll-container:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="relative w-full overflow-hidden bg-slate-900 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-600 py-3 group">
            <div className="flex ticker-scroll-container whitespace-nowrap">
              {/* Duplicate content for seamless loop */}
              {[...updates, ...updates].map((update, i) => {
                const changeColor = update.change >= 0 ? 'text-green-400' : 'text-red-400';
                const bgColor = update.change >= 0
                  ? 'bg-green-900/20 border-green-700/50'
                  : 'bg-red-900/20 border-red-700/50';
                // Use stable key: symbol + duplicate index (0-99 for first copy, 100-199 for second)
                // Position in array is stable since we don't reorder, only update values
                const isSecondCopy = i >= updates.length;
                const originalIndex = isSecondCopy ? i - updates.length : i;
                const stableKey = `ticker-${update.symbol}-${originalIndex}-${isSecondCopy ? 'copy' : 'orig'}`;
                return (
                  <div
                    key={stableKey}
                    className={`inline-flex items-center gap-2 px-4 py-2 mx-2 rounded-lg border ${bgColor} flex-shrink-0 transition-opacity hover:opacity-90`}
                  >
                    <span className="font-mono font-bold text-indigo-400 text-sm">
                      {update.symbol}
                    </span>
                    <span className="text-slate-300 dark:text-slate-200 font-mono text-sm transition-colors duration-200">
                      {formatPrice(update.price)}
                    </span>
                    <span className={`font-mono font-semibold text-sm ${changeColor} transition-colors duration-200`}>
                      {update.change >= 0 ? '+' : ''}{formatPrice(update.change)} ({update.changePercent >= 0 ? '+' : ''}{update.changePercent.toFixed(2)}%)
                    </span>
                    <span className="text-slate-500 text-xs">|</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 p-3">
          <p className="text-sm text-red-800 dark:text-red-200 font-medium">Error: {error}</p>
          {connectionState === 'error' && (
            <button
              onClick={() => {
                setError(null);
                reconnectAttemptsRef.current = 0;
                connect();
              }}
              className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Retry connection
            </button>
          )}
        </div>
      )}

      {/* Show message when no updates yet */}
      {updates.length === 0 && connectionState === 'connected' && (
        <div className="text-center py-8 bg-slate-900 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-600 flex-1 flex items-center justify-center">
          <div>
            <div className="text-slate-500 dark:text-slate-400 mb-2">
              <svg className="w-8 h-8 mx-auto animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              Waiting for market data updates...
            </p>
          </div>
        </div>
      )}

      {/* Show placeholder when stopped/disconnected/connecting to maintain height */}
      {(connectionState === 'disconnected' || connectionState === 'error' || connectionState === 'connecting' || connectionState === 'reconnecting') && updates.length === 0 && (
        <div className="flex-1 flex items-center justify-center min-h-[60px] bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-center">
            {(connectionState === 'connecting' || connectionState === 'reconnecting') ? (
              <>
                <div className="text-slate-400 dark:text-slate-500 mb-2">
                  <svg className="w-6 h-6 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {connectionState === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
                </p>
              </>
            ) : (
              <>
                <div className="text-slate-400 dark:text-slate-500 mb-2">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Ticker stopped. Click Start to begin receiving live updates.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

