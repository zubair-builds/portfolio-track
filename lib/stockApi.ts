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

/**
 * Fetch stock price from API route
 */
export async function fetchStockPrice(symbol: string): Promise<StockApiResponse['data'] | null> {
  try {
    const response = await fetch(`/api/symbols/fetch-price?symbol=${symbol.toUpperCase()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch all stock prices for multiple symbols
 * Makes a batch request to the API
 */
export async function fetchAllStockPrices(symbols: string[]): Promise<Map<string, StockApiResponse['data']>> {
  const results = new Map<string, StockApiResponse['data']>();
  
  if (symbols.length === 0) {
    return results;
  }

  try {
    console.log('======fetching batch stock prices:', symbols.length);
    // Make batch request to API
    const response = await fetch('/api/symbols/fetch-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      // Convert array to Map
      Object.entries(result.data).forEach(([symbol, data]: [string, any]) => {
        results.set(symbol.toUpperCase(), data);
      });
    }
  } catch (error) {
    console.error('Error fetching batch stock prices:', error);
  }
  
  return results;
}
