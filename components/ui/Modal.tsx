'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    headerContent?: React.ReactNode;
    showCloseButton?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    className = '',
    headerContent,
    showCloseButton = true,
}: ModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Prevent scrolling on body when modal is open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-indigo-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with gradient background */}
                <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-800 px-8 pt-8 pb-6">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-3">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <span className="text-xs font-medium text-white">Portfolio Track</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-1">{title}</h2>
                            {subtitle && <p className="text-sm text-indigo-100">{subtitle}</p>}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all duration-200 hover:rotate-90"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Optional Header Content (e.g. Tabs) */}
                    {headerContent && (
                        <div className="mt-4">
                            {headerContent}
                        </div>
                    )}
                </div>

                {/* Body with smooth scroll */}
                <div className="px-8 py-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
