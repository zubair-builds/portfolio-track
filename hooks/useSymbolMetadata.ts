import { useEffect, useState } from 'react';
import { SymbolPriceData } from '../lib/symbolsStore';

export interface SymbolMetadata {
  symbol: string;
  name?: string;
  sectorName?: string;
  isETF?: boolean;
  isDebt?: boolean;
  isGEM?: boolean;
  isNonCompliant?: boolean;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  listedIn?: string;
}

/**
 * Hook to fetch symbol metadata for multiple symbols
 * Returns a map for easy lookup by symbol
 */
export function useSymbolMetadata(symbols: string[]) {
  const [metadata, setMetadata] = useState<Map<string, SymbolMetadata>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (symbols.length === 0) {
      setMetadata(new Map());
      setLoading(false);
      return;
    }

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch metadata from API endpoint
        const response = await fetch('/api/symbols/metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbols }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch symbol metadata');
        }

        const data = await response.json();
        const metadataMap = new Map<string, SymbolMetadata>();
        
        Object.entries(data.metadata).forEach(([symbol, meta]) => {
          metadataMap.set(symbol, meta as SymbolMetadata);
        });

        setMetadata(metadataMap);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error('Error fetching symbol metadata:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [symbols.join(',')]); // Dependency on symbols array (converted to string for stable comparison)

  return { metadata, loading, error };
}

