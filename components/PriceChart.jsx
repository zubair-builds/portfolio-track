import React from 'react';
import ChartClient from './ChartClient';

/**
 * @typedef {Object} PriceChartProps
 * @property {Array<[number, number, number]>} [stockIndexData] - Legacy prop: array of [timestamp, price, volume]
 * @property {string} [symbol] - Symbol to fetch data for
 * @property {boolean} [isIndex] - Whether the symbol is an index
 */

/**
 * @param {PriceChartProps} props
 */
export default function PriceChart({ stockIndexData, symbol, isIndex }) {
  // If symbol prop is provided, we need to fetch data
  if (symbol) {
    return <ChartWithFetch symbol={symbol} isIndex={isIndex || false} />;
  }

  // Legacy: direct data prop (stockIndexData is required in this path)
  if (!stockIndexData) {
    return <div className="text-center text-slate-500 py-8">No chart data available</div>;
  }

  const formattedData = stockIndexData.map(([timestamp, price, volume]) => ({
    time: timestamp,
    value: price,
  }));

  const sortedData = formattedData.sort((a, b) => a.time - b.time);

  return (
    <div>
      <ChartClient data={sortedData} />
    </div>
  );
}

function ChartWithFetch({ symbol, isIndex }) {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const endpoint = isIndex 
          ? `/api/indices/${symbol}/history?limit=365`
          : `/api/klines/${symbol}?timeframe=1d&range=1y`;
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch chart data');
        
        const result = await response.json();
        
        let chartData = [];
        if (isIndex && result.history) {
          chartData = result.history.map(item => ({
            time: new Date(item.timestamp).getTime() / 1000,
            value: item.price,
          }));
        } else if (!isIndex && result.data) {
          chartData = result.data.map(item => ({
            time: new Date(item.date).getTime() / 1000,
            value: item.price,
          }));
        }
        
        // Sort by time
        const sortedData = chartData.sort((a, b) => a.time - b.time);
        
        // Deduplicate by keeping only the last entry for each unique timestamp
        const timeMap = new Map();
        sortedData.forEach(item => {
          timeMap.set(item.time, item);
        });
        
        // Convert map back to array (maintains insertion order, which is sorted)
        const deduplicatedData = Array.from(timeMap.values());
        
        setData(deduplicatedData);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (symbol) {
      fetchData();
    }
  }, [symbol, isIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">No chart data available</div>
      </div>
    );
  }

  return <ChartClient data={data} />;
}
