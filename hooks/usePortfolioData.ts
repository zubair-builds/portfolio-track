'use client';

import { useState, useEffect } from 'react';
import {
  Stock,
  initialPortfolioData,
  WatchlistItem,
  initialWatchlistData,
  StockDetails,
} from '../lib/portfolioData';
import { fetchAllStockPrices, getCacheStats } from '../lib/stockApi';

type WatchlistStock = WatchlistItem & {
  currentPrice: number | null;
  details?: StockDetails;
};

export function usePortfolioData() {
  const [stocks, setStocks] = useState<Stock[]>(initialPortfolioData);
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>(
    initialWatchlistData.map((item) => ({
      ...item,
      currentPrice: null,
    }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updateLastSavedTimestamp = () => {
    const { latestCache } = getCacheStats();
    setLastUpdated(latestCache ? new Date(latestCache) : null);
  };

  useEffect(() => {
    updateLastSavedTimestamp();

    const loadStockPrices = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const symbols = Array.from(
          new Set([
            ...initialPortfolioData.map((stock) => stock.symbol),
            ...initialWatchlistData.map((item) => item.symbol),
          ])
        );

        const priceData = await fetchAllStockPrices(symbols);

        const updatedStocks = initialPortfolioData.map((stock) => {
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

        const updatedWatchlist = initialWatchlistData.map((item) => {
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
        setStocks(initialPortfolioData);
        setWatchlist(
          initialWatchlistData.map((item) => ({
            ...item,
            currentPrice: null,
          }))
        );
      } finally {
        updateLastSavedTimestamp();
        setIsLoading(false);
      }
    };

    loadStockPrices();
  }, []);

  return {
    stocks,
    watchlist,
    isLoading,
    error,
    lastUpdated,
  };
}

