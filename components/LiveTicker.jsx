'use client';
import { useEffect, useRef, useState } from 'react';

export default function LiveTicker({ marketType = 'REG' }) {
  const wsRef = useRef(null);
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'wss://psxterminal.com/');
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        subscriptionType: 'marketData',
        params: { marketType }
      }));
    };
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        // push latest updates (apply small in-memory buffer)
        setUpdates(u => [{ ...d, timestamp: new Date() }, ...u].slice(0, 50));
      } catch(e) { console.error(e); }
    };
    ws.onerror = console.error;
    return () => ws.close();
  }, [marketType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Real-time updates ({marketType})
          </span>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {updates.length} updates
        </div>
      </div>
      
      <div className="bg-slate-900 dark:bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto border border-slate-700 dark:border-slate-600">
        <div className="space-y-2">
          {updates.length > 0 ? (
            updates.map((update, i) => (
              <div 
                key={`${update.timestamp}-${i}`} // Using a more robust key
                className="bg-slate-800 dark:bg-slate-700 rounded-md p-3 border-l-4 border-success-500 hover:bg-slate-750 dark:hover:bg-slate-650 transition-colors duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-success-400 rounded-full animate-pulse"></div>
                    <span className="text-success-400 font-mono text-sm">
                      {update.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 text-xs">
                    #{i + 1}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="text-slate-300 dark:text-slate-200"><span className="font-bold">Symbol:</span> {update.symbol}</div>
                  <div className="text-slate-300 dark:text-slate-200"><span className="font-bold">Price:</span> {update.price}</div>
                  <div className="text-slate-300 dark:text-slate-200"><span className="font-bold">Volume:</span> {update.volume}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="text-slate-500 dark:text-slate-400 mb-2">
                <svg className="w-8 h-8 mx-auto animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-sm">Waiting for live market data...</p>
            </div>
          )}
        </div>
      </div>
      
      {updates.length > 0 && (
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Latest update: {updates[0].timestamp.toLocaleTimeString()}</span>
          <button 
            onClick={() => setUpdates([])}
            className="text-danger-400 hover:text-danger-300 transition-colors duration-150 font-medium"
          >
            Clear updates
          </button>
        </div>
      )}
    </div>
  );
}
