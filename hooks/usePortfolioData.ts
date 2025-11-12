'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Stock,
  initialPortfolioData,
  WatchlistItem,
  initialWatchlistData,
  StockDetails,
} from '../lib/portfolioData';
import { fetchAllStockPrices } from '../lib/stockApi';

type WatchlistStock = WatchlistItem & {
  currentPrice: number | null;
  details?: StockDetails;
};

export function usePortfolioData(userEmail?: string, options?: { loadWatchlist?: boolean }) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const shouldLoadWatchlist = options?.loadWatchlist !== false; // Default to true for backward compatibility

  const updateLastSavedTimestamp = async () => {
    try {
      const response = await fetch('/api/symbols/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats.latestCache) {
          setLastUpdated(new Date(data.stats.latestCache));
        }
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    }
  };

  const loadPortfolioData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch user's portfolio and watchlist from API
      let portfolioHoldings = initialPortfolioData;
      let watchlistItems = initialWatchlistData;

      if (userEmail) {
        try {
          const fetchPromises: Promise<any>[] = [
            fetch('/api/portfolio', {
              headers: { 'X-User-Id': userEmail },
            }),
          ];

          // Only fetch watchlist if shouldLoadWatchlist is true
          if (shouldLoadWatchlist) {
            fetchPromises.push(
              fetch('/api/watchlist', {
                headers: { 'X-User-Id': userEmail },
              })
            );
          }

          const responses = await Promise.all(fetchPromises);
          const portfolioRes = responses[0];
          const watchlistRes = shouldLoadWatchlist ? responses[1] : null;

          if (portfolioRes.ok) {
            const portfolioData = await portfolioRes.json();
            portfolioHoldings = portfolioData.portfolio.map((p: any) => ({
              symbol: p.symbol,
              shares: p.shares,
              avgBuy: p.avgBuy,
              currentPrice: 0, // Will be filled with live data
            }));
          }

          if (shouldLoadWatchlist && watchlistRes?.ok) {
            const watchlistData = await watchlistRes.json();
            watchlistItems = watchlistData.watchlist.map((w: any) => ({
              symbol: w.symbol,
              thesis: w.thesis,
              targetPrice: w.targetPrice,
              note: w.note,
            }));
          }
        } catch (apiError) {
          console.warn('Failed to fetch user data, using defaults:', apiError);
        }
      }

      const symbols = Array.from(
        new Set([
          ...portfolioHoldings.map((stock) => stock.symbol),
          ...watchlistItems.map((item) => item.symbol),
        ])
      );

      console.log('===portfolio data===symbols:', symbols.length);
      const priceData = await fetchAllStockPrices(symbols);

      const updatedStocks = portfolioHoldings.map((stock) => {
        const apiData = priceData.get(stock.symbol.toUpperCase());

        if (apiData) {
          const normalizedTimestamp = apiData.timestamp
            ? apiData.timestamp > 1_000_000_000_000
              ? apiData.timestamp
              : apiData.timestamp * 1000
            : Date.now();

          return {
            ...stock,
            currentPrice: apiData.price,
            details: {
              change: apiData.change,
              changePercent: apiData.changePercent,
              volume: apiData.volume,
              trades: apiData.trades,
              value: apiData.value,
              high: apiData.high,
              low: apiData.low,
              bid: apiData.bid,
              ask: apiData.ask,
              bidVol: apiData.bidVol,
              askVol: apiData.askVol,
              lastUpdated: normalizedTimestamp,
            },
          };
        }

        return stock;
      });

      const updatedWatchlist = watchlistItems.map((item) => {
        const apiData = priceData.get(item.symbol.toUpperCase());

        if (apiData) {
          const normalizedTimestamp = apiData.timestamp
            ? apiData.timestamp > 1_000_000_000_000
              ? apiData.timestamp
              : apiData.timestamp * 1000
            : Date.now();

          return {
            ...item,
            currentPrice: apiData.price,
            details: {
              change: apiData.change,
              changePercent: apiData.changePercent,
              volume: apiData.volume,
              trades: apiData.trades,
              value: apiData.value,
              high: apiData.high,
              low: apiData.low,
              bid: apiData.bid,
              ask: apiData.ask,
              bidVol: apiData.bidVol,
              askVol: apiData.askVol,
              lastUpdated: normalizedTimestamp,
            },
          } as WatchlistStock;
        }

        return {
          ...item,
          currentPrice: null,
        } as WatchlistStock;
      });

      setStocks(updatedStocks as Stock[]);
      setWatchlist(updatedWatchlist);
    } catch (err) {
      console.error('Error loading stock prices:', err);
      setError('Failed to load some stock prices. Using default values.');
      setStocks([]);
      setWatchlist([]);
    } finally {
      updateLastSavedTimestamp();
      setIsLoading(false);
    }
  };

  useEffect(() => {
    updateLastSavedTimestamp();
    loadPortfolioData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const loadWatchlist = useCallback(async () => {
    if (!userEmail) return; // No user
    if (watchlist.length > 0 && !isLoadingWatchlist) return; // Already loaded

    setIsLoadingWatchlist(true);
    try {
      const watchlistRes = await fetch('/api/watchlist', {
        headers: { 'X-User-Id': userEmail },
      });

      if (watchlistRes.ok) {
        const watchlistData = await watchlistRes.json();
        const watchlistItems = watchlistData.watchlist.map((w: any) => ({
          symbol: w.symbol,
          thesis: w.thesis,
          targetPrice: w.targetPrice,
          note: w.note,
        }));

        // Fetch prices for watchlist symbols
        const symbols = watchlistItems.map((item: any) => item.symbol);
        const priceData = await fetchAllStockPrices(symbols);

        const updatedWatchlist = watchlistItems.map((item: any) => {
          const apiData = priceData.get(item.symbol.toUpperCase());

          if (apiData) {
            const normalizedTimestamp = apiData.timestamp
              ? apiData.timestamp > 1_000_000_000_000
                ? apiData.timestamp
                : apiData.timestamp * 1000
              : Date.now();

            return {
              ...item,
              currentPrice: apiData.price,
              details: {
                change: apiData.change,
                changePercent: apiData.changePercent,
                volume: apiData.volume,
                trades: apiData.trades,
                value: apiData.value,
                high: apiData.high,
                low: apiData.low,
                bid: apiData.bid,
                ask: apiData.ask,
                bidVol: apiData.bidVol,
                askVol: apiData.askVol,
                lastUpdated: normalizedTimestamp,
              },
            } as WatchlistStock;
          }

          return {
            ...item,
            currentPrice: null,
          } as WatchlistStock;
        });

        setWatchlist(updatedWatchlist);
      }
    } catch (err) {
      console.error('Error loading watchlist:', err);
    } finally {
      setIsLoadingWatchlist(false);
    }
  }, [userEmail, watchlist.length, isLoadingWatchlist]);

  const refresh = async () => {
    await loadPortfolioData();
    // If watchlist was previously loaded, refresh it too
    if (watchlist.length > 0 && userEmail) {
      await loadWatchlist();
    }
  };

  return {
    stocks,
    watchlist,
    isLoading,
    isLoadingWatchlist,
    error,
    lastUpdated,
    refresh,
    loadWatchlist,
  };
}

