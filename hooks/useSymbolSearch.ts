import { useState, useEffect, useCallback, useRef } from 'react';

export interface SearchSymbol {
  symbol: string;
  name: string;
  sectorName: string;
  isETF: boolean;
  isDebt: boolean;
  isGEM: boolean;
  currentPrice?: number;
}

export interface SymbolSearchResult {
  symbols: SearchSymbol[];
  total: number;
  hasMore: boolean;
}

/**
 * Hook for searching symbols with debouncing and caching
 */
export function useSymbolSearch(
  query: string,
  excludeSymbols: string[] = [],
  debounceMs: number = 300
) {
  const [results, setResults] = useState<SearchSymbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, SymbolSearchResult>>(new Map());

  const search = useCallback(async (searchQuery: string, excludeList: string[]) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    const cacheKey = `${searchQuery}|${excludeList.join(',')}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached.symbols);
      setHasMore(cached.hasMore);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '10',
        offset: '0',
      });

      if (excludeList.length > 0) {
        params.set('exclude', excludeList.join(','));
      }

      const response = await fetch(`/api/symbols/search?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to search symbols');
      }

      const data: SymbolSearchResult = await response.json();
      
      // Cache the result
      cacheRef.current.set(cacheKey, data);
      
      // Limit cache size to 50 entries
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        cacheRef.current.delete(firstKey);
      }

      setResults(data.symbols);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error('Error searching symbols:', err);
      }
    } finally {
      if (controller === abortControllerRef.current) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    // Don't search if query is empty
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setHasMore(false);
      setTotal(0);
      return;
    }

    // Debounce the search
    const timeoutId = setTimeout(() => {
      search(query.trim(), excludeSymbols);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, excludeSymbols.join(','), debounceMs, search]);

  return { results, loading, error, hasMore, total };
}

