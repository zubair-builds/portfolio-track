'use client';

interface StrategyData {
    symbol: string;
    price: number;
    indicators: {
        ema20: number | null;
        ema50: number | null;
        rsi14: number | null;
        atr14: number | null;
        adx14: number | null;
        ema50Slope: number | null;
    };
    analysis: {
        stretch: number | null;
        isStretchValid: boolean;
        isRsiOversold: boolean;
        isEma50Flat: boolean;
        isRsiRising: boolean;
        signal: boolean;
        target: number | null;
        stopLoss: number | null;
    };
    error: string | null;
}

interface MeanReversionTableProps {
    data: StrategyData[];
    loading: boolean;
}

export default function MeanReversionTable({ data, loading }: MeanReversionTableProps) {
    if (loading) {
        return (
            <div className="w-full p-8 flex justify-center text-slate-500">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (data.length === 0) {
        return null; // Don't show if no symbols selected for strategy
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Symbol</th>
                            <th className="px-6 py-4 font-semibold text-right">Price</th>
                            <th className="px-6 py-4 font-semibold text-center">RSI State</th>
                            <th className="px-6 py-4 font-semibold text-right">Dist. EMA20 (ATR)</th>
                            <th className="px-6 py-4 font-semibold text-right">EMA50 Slope (5D/ATR)</th>
                            <th className="px-6 py-4 font-semibold text-center">Regime</th>
                            <th className="px-6 py-4 font-semibold text-left">Context Status</th>
                            <th className="px-6 py-4 font-semibold text-center">Trigger</th>
                            <th className="px-6 py-4 font-semibold text-center">Signal</th>
                            <th className="px-6 py-4 font-semibold text-right">Target</th>
                            <th className="px-6 py-4 font-semibold text-right">Stop</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.map((item) => {
                            if (item.error) return null;

                            const { symbol, price, indicators, analysis } = item;
                            const isSignal = analysis.signal;

                            // --- 1. RSI State Logic ---
                            let rsiState = 'Neutral';
                            let rsiColor = 'text-slate-500';
                            const rsiVal = indicators.rsi14 || 50;
                            if (rsiVal < 25) {
                                rsiState = 'Extreme Oversold';
                                rsiColor = 'text-red-600 font-bold';
                            } else if (rsiVal < 30) {
                                rsiState = 'Oversold';
                                rsiColor = 'text-emerald-600 font-medium';
                            }

                            // --- 2. Normalized Slope Logic ---
                            // Slope = abs(change) / ATR
                            const normalizedSlope = (indicators.ema50Slope && indicators.atr14)
                                ? (indicators.ema50Slope / indicators.atr14)
                                : null;

                            // --- 3. Regime Logic ---
                            const regime = analysis.isEma50Flat ? 'Ranging' : 'Trending';
                            const regimeColor = analysis.isEma50Flat
                                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';

                            // --- 4. Context Status Logic ---
                            let contextStatus = 'Wait';
                            let contextColor = 'text-slate-400';

                            if (!analysis.isStretchValid) {
                                // Directional Clarity
                                if (analysis.stretch && analysis.stretch > 0) {
                                    contextStatus = 'Above EMA20 (Ignore)';
                                    contextColor = 'text-slate-400 italic';
                                } else {
                                    contextStatus = 'Insufficient Stretch';
                                    contextColor = 'text-slate-500';
                                }
                            } else if (!analysis.isEma50Flat) {
                                contextStatus = 'Trending (Filtered)';
                                contextColor = 'text-amber-600';
                            } else if (!analysis.isRsiOversold) {
                                contextStatus = 'RSI Not Low';
                            } else if (!analysis.isRsiRising) {
                                contextStatus = 'Waiting RSI Turn';
                                contextColor = 'text-indigo-500 font-medium';
                            } else {
                                contextStatus = 'Context Met';
                                contextColor = 'text-emerald-600 font-bold';
                            }

                            // UX Guardrail: De-emphasize Target/Stop if context not met
                            const isContextMet = contextStatus === 'Context Met';
                            const planOpacity = isContextMet ? 'opacity-100' : 'opacity-40 grayscale';

                            return (
                                <tr
                                    key={symbol}
                                    className={`
                    hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                    ${isSignal ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}
                  `}
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {symbol}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                        {price.toFixed(2)}
                                    </td>

                                    {/* RSI State */}
                                    <td className={`px-6 py-4 text-center text-xs ${rsiColor}`}>
                                        {rsiState}
                                        <div className="text-[10px] text-slate-400 font-normal">{rsiVal.toFixed(1)}</div>
                                    </td>

                                    {/* Stretch (Distance from EMA20) */}
                                    <td className={`px-6 py-4 text-right font-medium ${analysis.stretch && analysis.stretch < -2 ? 'text-red-600 dark:text-red-400' : 'text-slate-600'}`}>
                                        {analysis.stretch?.toFixed(1) || '-'} ATR
                                    </td>

                                    {/* Normalized Slope */}
                                    <td className={`px-6 py-4 text-right ${analysis.isEma50Flat ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {normalizedSlope?.toFixed(2) || '-'}
                                    </td>

                                    {/* Regime */}
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${regimeColor}`}>
                                            {regime}
                                        </span>
                                    </td>

                                    {/* Context Status */}
                                    <td className={`px-6 py-4 text-left text-xs ${contextColor}`}>
                                        {contextStatus}
                                    </td>

                                    {/* Trigger Status (Rising RSI) */}
                                    <td className="px-6 py-4 text-center text-xs">
                                        {analysis.isRsiRising ? (
                                            <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                                                ⬆ Turned Up
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">Waiting Turn</span>
                                        )}
                                    </td>

                                    {/* BUY SIGNAL */}
                                    <td className="px-6 py-4 text-center">
                                        {isSignal ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm animate-pulse">
                                                BUY
                                            </span>
                                        ) : (
                                            <span className="text-xs font-mono text-slate-300">NONE</span>
                                        )}
                                    </td>

                                    <td className={`px-6 py-4 text-right text-slate-600 dark:text-slate-400 font-mono text-xs ${planOpacity}`}>
                                        {analysis.target?.toFixed(2) || '-'}
                                    </td>
                                    <td className={`px-6 py-4 text-right text-rose-600 dark:text-rose-400 font-mono text-xs ${planOpacity}`}>
                                        {analysis.stopLoss?.toFixed(2) || '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 px-2 justify-center sm:justify-end">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Context Met
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" /> Buy Signal
                </div>
            </div>
        </div>
    );
}
