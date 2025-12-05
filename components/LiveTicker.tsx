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
        if (!isMountedRef.current) return;
        console.error('WebSocket error occurred'); // Avoid logging the event object directly to prevent potential serialization issues
        setConnectionState('error');
        setError('Connection error occurred');
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;
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
            if (isMountedRef.current) {
              connect();
            }
          }, delay);
        } else if (!isManualDisconnectRef.current) {
          setError('Maximum reconnection attempts reached. Please refresh the page.');
        }

        // Reset manual disconnect flag after handling
        isManualDisconnectRef.current = false;
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      if (isMountedRef.current) {
        setConnectionState('error');
        setError('Failed to create WebSocket connection');
      }
    }
  }, [marketType, getNextRequestId, sendPong, flushBatchUpdates]);

  useEffect(() => {
    isMountedRef.current = true;
    const batchUpdates = batchUpdatesRef.current;

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

      // Clear any remaining batch updates
      if (batchUpdates) {
        batchUpdates.clear();
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
    <div className="relative h-full overflow-hidden rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 shadow-xl shadow-indigo-500/5 ring-1 ring-black/5 flex flex-col justify-center">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-4 space-y-3 h-full flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`relative flex h-3 w-3`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionState === 'connected' ? 'bg-emerald-400' : connectionState === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${connectionState === 'connected' ? 'bg-emerald-500' : connectionState === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Market Pulse
              </h3>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="uppercase tracking-wider">{marketType}</span>
                <span>•</span>
                <span className={`${connectionState === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                  {getConnectionStatusText()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const dummyData: MarketUpdate[] = [
                  { symbol: 'OGDC', market: 'REG', price: 118.50, change: 2.30, changePercent: 1.98, volume: 500000, trades: 150, value: 59250000, high: 119.00, low: 116.50, bid: 118.40, ask: 118.60, bidVol: 1000, askVol: 1500, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                  { symbol: 'PPL', market: 'REG', price: 78.25, change: -1.15, changePercent: -1.45, volume: 350000, trades: 120, value: 27387500, high: 79.50, low: 77.80, bid: 78.20, ask: 78.30, bidVol: 800, askVol: 1200, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                  { symbol: 'TRG', market: 'REG', price: 95.60, change: 4.50, changePercent: 4.94, volume: 1200000, trades: 450, value: 114720000, high: 95.60, low: 91.00, bid: 95.50, ask: 95.70, bidVol: 5000, askVol: 2000, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                  { symbol: 'LUCK', market: 'REG', price: 650.00, change: 12.50, changePercent: 1.96, volume: 150000, trades: 80, value: 97500000, high: 655.00, low: 640.00, bid: 649.50, ask: 650.50, bidVol: 200, askVol: 300, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                  { symbol: 'SYS', market: 'REG', price: 420.75, change: -5.25, changePercent: -1.23, volume: 200000, trades: 100, value: 84150000, high: 428.00, low: 418.00, bid: 420.50, ask: 421.00, bidVol: 400, askVol: 600, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                  { symbol: 'ENGRO', market: 'REG', price: 285.40, change: 1.80, changePercent: 0.63, volume: 180000, trades: 90, value: 51372000, high: 287.00, low: 284.00, bid: 285.20, ask: 285.60, bidVol: 300, askVol: 500, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                  { symbol: 'HUBC', market: 'REG', price: 85.90, change: 0.40, changePercent: 0.47, volume: 600000, trades: 200, value: 51540000, high: 86.50, low: 85.00, bid: 85.80, ask: 86.00, bidVol: 1500, askVol: 1800, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                  { symbol: 'UBL', market: 'REG', price: 145.20, change: -0.80, changePercent: -0.55, volume: 250000, trades: 110, value: 36300000, high: 146.50, low: 144.80, bid: 145.00, ask: 145.40, bidVol: 600, askVol: 900, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                  { symbol: 'MCB', market: 'REG', price: 168.50, change: 1.50, changePercent: 0.90, volume: 180000, trades: 85, value: 30330000, high: 169.00, low: 167.00, bid: 168.30, ask: 168.70, bidVol: 400, askVol: 700, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                  { symbol: 'FFC', market: 'REG', price: 112.30, change: 0.70, changePercent: 0.63, volume: 300000, trades: 130, value: 33690000, high: 113.00, low: 111.50, bid: 112.20, ask: 112.40, bidVol: 800, askVol: 1000, state: 'OPEN', timestamp: Date.now(), receivedAt: new Date() },
                ];
                setUpdates(dummyData);
                setConnectionState('connected');
              }}
              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              title="Load Demo Data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button
              onClick={handleToggleConnection}
              disabled={connectionState === 'connecting' || connectionState === 'reconnecting'}
              className={`p-2 rounded-lg transition-colors ${connectionState === 'connected' || connectionState === 'reconnecting'
                ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={connectionState === 'connected' || connectionState === 'reconnecting' ? 'Stop Ticker' : 'Start Ticker'}
            >
              {connectionState === 'connected' || connectionState === 'reconnecting' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Horizontal Scrolling Ticker */}
        {updates.length > 0 && connectionState === 'connected' && (
          <>
            <style>{`
              @keyframes ticker-scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .ticker-scroll-container {
                animation: ticker-scroll 40s linear infinite;
              }
              .ticker-scroll-container:hover {
                animation-play-state: paused;
              }
            `}</style>
            <div className="relative w-full overflow-hidden py-2 group">
              {/* Fade masks for smooth edges */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />

              <div className="flex ticker-scroll-container whitespace-nowrap">
                {[...updates, ...updates].map((update, i) => {
                  const isPositive = update.change >= 0;
                  const isSecondCopy = i >= updates.length;
                  const originalIndex = isSecondCopy ? i - updates.length : i;
                  const stableKey = `ticker-${update.symbol}-${originalIndex}-${isSecondCopy ? 'copy' : 'orig'}`;

                  return (
                    <div
                      key={stableKey}
                      className="inline-flex items-center gap-3 px-5 py-3 mx-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 cursor-default"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
                          {update.symbol}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {formatPrice(update.price)}
                        </span>
                      </div>

                      <div className={`flex flex-col items-end ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        <div className="flex items-center gap-1 font-bold text-sm">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                          </svg>
                          <span>{isPositive ? '+' : ''}{formatPrice(update.change)}</span>
                        </div>
                        <span className="text-xs font-medium bg-current/10 px-1.5 py-0.5 rounded-md">
                          {isPositive ? '+' : ''}{update.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30 p-4 flex items-start gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-full text-rose-600 dark:text-rose-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">Connection Error</h4>
              <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">{error}</p>
              {connectionState === 'error' && (
                <button
                  onClick={() => {
                    setError(null);
                    reconnectAttemptsRef.current = 0;
                    connect();
                  }}
                  className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 underline decoration-rose-400/50 underline-offset-2"
                >
                  Retry connection
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {updates.length === 0 && connectionState === 'connected' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-indigo-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-slate-900 dark:text-white font-medium">Waiting for market data...</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time updates will appear here automatically</p>
          </div>
        )}

        {/* Stopped/Connecting State */}
        {(connectionState === 'disconnected' || connectionState === 'error' || connectionState === 'connecting' || connectionState === 'reconnecting') && updates.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-2 text-center min-h-[80px]">
            {(connectionState === 'connecting' || connectionState === 'reconnecting') ? (
              <div className="flex items-center gap-3">
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-100 dark:border-slate-800"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm text-slate-900 dark:text-white font-medium">
                  {connectionState === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm text-slate-900 dark:text-white font-medium leading-none">Ticker Paused</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Click Start to resume</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

