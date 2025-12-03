'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
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
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Upload Transactions</DialogTitle>
                </DialogHeader>

                {step === 'input' ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Paste your transaction JSON data below. The system will automatically detect Buy/Sell operations based on balance changes.
                        </p>
                        <textarea
                            className="w-full h-64 p-4 font-mono text-sm border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                            placeholder='[{"date": "...", "securitySymbol": "...", ...}]'
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                        />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleParse} disabled={!jsonInput.trim()}>
                                Preview Transactions
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Detected Transactions ({previewData.length})</h3>
                            <Button variant="outline" size="sm" onClick={() => setStep('input')}>Back to Input</Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Symbol</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3 text-right">Shares</th>
                                        <th className="p-3 text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {previewData.map((tx, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-3">{tx.originalDate}</td>
                                            <td className="p-3 font-medium">{tx.symbol}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${tx.transactionType === 'BUY'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {tx.transactionType}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">{formatNumber(tx.shares)}</td>
                                            <td className="p-3 text-right text-slate-500">0.00</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleUpload} disabled={loading || previewData.length === 0}>
                                {loading ? 'Uploading...' : 'Confirm Upload'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
