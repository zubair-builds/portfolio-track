'use client';

import * as React from 'react';

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={() => onOpenChange(false)}
            />
            {/* Content Container */}
            <div className="relative z-50 w-full max-w-lg p-4">
                {children}
            </div>
        </div>
    );
}

export function DialogContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 w-full overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            {children}
        </div>
    );
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {children}
        </h2>
    );
}
