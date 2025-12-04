'use client';

import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { formatNumber } from '@/lib/constants';

interface TransactionUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
}

interface ParsedTransaction {
    date: string;
    securitySymbol: string;
    securityName: string;
    transVolume: string;
    transId: string;
    available: string;
}

interface DetectedTransaction {
    symbol: string;
    transactionType: 'BUY' | 'SELL';
    shares: number;
    pricePerShare: number;
    transactionDate: string; // ISO string
    notes: string;
    originalDate: string; // DD/MM/YYYY
}

export default function TransactionUploadModal({ isOpen, onClose, onUploadComplete }: TransactionUploadModalProps) {
    const [jsonInput, setJsonInput] = useState('');
    const [previewData, setPreviewData] = useState<DetectedTransaction[]>([]);
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseDate = (dateStr: string) => {
        // Format: DD/MM/YYYY
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year}-${month}-${day}`);
    };

    const handleParse = () => {
        setError(null);
        try {
            // Sanitize input: remove non-breaking spaces and other invisible characters
            const sanitizedInput = jsonInput
                .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ') // Replace non-breaking spaces and zero-width chars with space
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            const rawData: ParsedTransaction[] = JSON.parse(sanitizedInput);

            if (!Array.isArray(rawData)) {
                throw new Error('Input must be a JSON array');
            }

            // Group by symbol
            const bySymbol: Record<string, (ParsedTransaction & { originalIndex: number })[]> = {};
            rawData.forEach((item, index) => {
                if (!bySymbol[item.securitySymbol]) {
                    bySymbol[item.securitySymbol] = [];
                }
                // Add original index to preserve order for same-day transactions
                bySymbol[item.securitySymbol].push({ ...item, originalIndex: index });
            });

            const detected: DetectedTransaction[] = [];

            // Process each symbol
            Object.values(bySymbol).forEach((transactions) => {
                // Sort by date and originalIndex to ensure correct order
                transactions.sort((a, b) => {
                    const dateA = parseDate(a.date).getTime();
                    const dateB = parseDate(b.date).getTime();
                    if (dateA !== dateB) return dateA - dateB;
                    // Use original index as tie breaker instead of transId which is unreliable
                    return a.originalIndex - b.originalIndex;
                });

                let previousAvailable = 0;

                transactions.forEach((tx) => {
                    const currentAvailable = parseInt(tx.available.replace(/,/g, ''), 10);
                    const delta = currentAvailable - previousAvailable;

                    if (delta > 0) {
                        detected.push({
                            symbol: tx.securitySymbol,
                            transactionType: 'BUY',
                            shares: delta,
                            pricePerShare: 0,
                            transactionDate: parseDate(tx.date).toISOString(),
                            notes: `Imported ${tx.transId}`,
                            originalDate: tx.date
                        });
                    } else if (delta < 0) {
                        detected.push({
                            symbol: tx.securitySymbol,
                            transactionType: 'SELL',
                            shares: Math.abs(delta),
                            pricePerShare: 0,
                            transactionDate: parseDate(tx.date).toISOString(),
                            notes: `Imported ${tx.transId}`,
                            originalDate: tx.date
                        });
                    }

                    // Update previous for next iteration
                    previousAvailable = currentAvailable;
                });
            });

            setPreviewData(detected);
            setStep('preview');

        } catch (err) {
            setError('Failed to parse JSON. Please check the format.');
            console.error(err);
        }
    };

    const handleUpload = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/transactions/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: previewData }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                onUploadComplete();
                onClose();
                // Reset
                setJsonInput('');
                setPreviewData([]);
                setStep('input');
            } else {
                setError(result.error || 'Upload failed');
            }
        } catch {
            setError('An error occurred during upload');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Upload Transactions"
            subtitle={step === 'input' ? 'Paste your transaction data' : 'Review detected transactions'}
        >
            <div className="space-y-6">
                {step === 'input' ? (
                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Paste your transaction JSON data below. The system will automatically detect Buy/Sell operations based on balance changes.
                            </p>
                        </div>

                        <div className="relative">
                            <textarea
                                className="w-full h-64 p-4 font-mono text-sm border-2 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                                placeholder='[{"date": "...", "securitySymbol": "...", ...}]'
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3">
                                <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleParse}
                                disabled={!jsonInput.trim()}
                                className="flex-1"
                            >
                                Preview Transactions
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                                Detected Transactions <span className="text-slate-500 dark:text-slate-400 font-normal">({previewData.length})</span>
                            </h3>
                            <Button variant="secondary" size="sm" onClick={() => setStep('input')}>
                                Back to Input
                            </Button>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 sticky top-0 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="p-3 font-semibold">Date</th>
                                            <th className="p-3 font-semibold">Symbol</th>
                                            <th className="p-3 font-semibold">Type</th>
                                            <th className="p-3 font-semibold text-right">Shares</th>
                                            <th className="p-3 font-semibold text-right">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                        {previewData.map((tx, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-3 text-slate-600 dark:text-slate-400">{tx.originalDate}</td>
                                                <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{tx.symbol}</td>
                                                <td className="p-3">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${tx.transactionType === 'BUY'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                        }`}>
                                                        {tx.transactionType}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-medium text-slate-700 dark:text-slate-300">{formatNumber(tx.shares)}</td>
                                                <td className="p-3 text-right text-slate-400 font-mono">0.00</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3">
                                <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={loading || previewData.length === 0}
                                className="flex-1"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Uploading...
                                    </span>
                                ) : 'Confirm Upload'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
