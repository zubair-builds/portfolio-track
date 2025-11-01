export interface StockApiResponse {
  success: boolean;
  data: {
    market: string;
    st: string;
    symbol: string;
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
    timestamp: number;
  };
  timestamp: number;
}

const STORAGE_KEY = 'psx_stock_prices';

interface CachedStockData {
  data: StockApiResponse['data'];
  cachedAt: number;
}

interface StorageData {
  [symbol: string]: CachedStockData;
}

/**
 * Get cached stock data from localStorage
 */
export function getCachedStockData(symbol: string): StockApiResponse['data'] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: StorageData = JSON.parse(stored);
    const symbolData = data[symbol.toUpperCase()];

    if (!symbolData) return null;

    return symbolData.data;
  } catch (error) {
    console.error(`Error reading cached data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Save stock data to localStorage
 */
export function saveStockDataToCache(symbol: string, data: StockApiResponse['data']): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storageData: StorageData = stored ? JSON.parse(stored) : {};

    storageData[symbol.toUpperCase()] = {
      data,
      cachedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
  } catch (error) {
    console.error(`Error saving data for ${symbol}:`, error);
  }
}

/**
 * Fetch stock data from PSX Terminal API
 */
export async function fetchStockPrice(symbol: string): Promise<StockApiResponse['data'] | null> {
  try {

    
    const response = await fetch(`/api/psx/ticks/REG/${symbol.toUpperCase()}`);
    console.log('response', response);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: StockApiResponse = await response.json();
    console.log('resresultponse', result);

    if (result.success && result.data) {
      // Save to cache
      saveStockDataToCache(symbol, result.data);
      return result.data;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get stock data - first checks cache, then fetches from API if needed
 */
export async function getStockData(symbol: string): Promise<StockApiResponse['data'] | null> {
  // First, try to get from cache
  const cached = getCachedStockData(symbol);
  if (cached) {
    console.log(`Using cached data for ${symbol}`);
    return cached;
  }

  // If not in cache, fetch from API
  console.log(`Fetching fresh data for ${symbol}`);
  return await fetchStockPrice(symbol);
}

/**
 * Fetch all stock prices for multiple symbols
 */
export async function fetchAllStockPrices(symbols: string[]): Promise<Map<string, StockApiResponse['data']>> {
  const results = new Map<string, StockApiResponse['data']>();
  
  // Fetch all stocks in parallel, but with a small delay between each to avoid rate limiting
  const promises = symbols.map((symbol, index) => {
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        const data = await getStockData(symbol);
        if (data) {
          results.set(symbol.toUpperCase(), data);
        }
        resolve();
      }, index * 100); // 100ms delay between each request
    });
  });

  await Promise.all(promises);
  return results;
}

/**
 * Clear all cached stock data
 */
export function clearStockCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Stock cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { totalSymbols: number; oldestCache: number | null; latestCache: number | null } {
  if (typeof window === 'undefined') return { totalSymbols: 0, oldestCache: null, latestCache: null };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { totalSymbols: 0, oldestCache: null, latestCache: null };

    const data: StorageData = JSON.parse(stored);
    const symbols = Object.keys(data);
    
    let oldestCache: number | null = null;
    let latestCache: number | null = null;
    symbols.forEach((symbol) => {
      const cachedAt = data[symbol].cachedAt;
      if (!oldestCache || cachedAt < oldestCache) {
        oldestCache = cachedAt;
      }
      if (!latestCache || cachedAt > latestCache) {
        latestCache = cachedAt;
      }
    });

    return {
      totalSymbols: symbols.length,
      oldestCache,
      latestCache,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { totalSymbols: 0, oldestCache: null, latestCache: null };
  }
}

