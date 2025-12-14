'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthProvider';

interface AutoRefreshContextType {
    frequency: number; // in minutes, 0 means off
    setFrequency: (minutes: number) => void;
    lastRefreshed: Date | null;
    isRefreshing: boolean;
    refreshNow: () => Promise<void>;
}

const AutoRefreshContext = createContext<AutoRefreshContextType | undefined>(undefined);

export function useAutoRefresh() {
    const context = useContext(AutoRefreshContext);
    if (!context) {
        throw new Error('useAutoRefresh must be used within an AutoRefreshProvider');
    }
    return context;
}

export function AutoRefreshProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [frequency, setFrequency] = useState<number>(0);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Load saved frequency from local storage on mount
    useEffect(() => {
        const savedFrequency = localStorage.getItem('autoRefreshFrequency');
        if (savedFrequency) {
            setFrequency(parseInt(savedFrequency, 10));
        }
    }, []);

    const refreshNow = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);

        try {
            // 1. Refresh Indices (KSE100, etc.)
            const indicesPromise = fetch('/api/indices/refresh?all=true');

            // 2. Refresh Symbols Prices (Watchlist/Portfolio)
            // Only if user is logged in, as this endpoint might require auth or user context
            const symbolsPromise = user?.email
                ? fetch('/api/symbols/refresh-prices', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Id': user.email,
                    },
                })
                : Promise.resolve(null);

            await Promise.allSettled([indicesPromise, symbolsPromise]);

            setLastRefreshed(new Date());
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, user]);

    // Handle auto-refresh interval
    useEffect(() => {
        if (frequency <= 0) return;

        // Initial check or setup interval
        const intervalId = setInterval(() => {
            refreshNow();
        }, frequency * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [frequency, refreshNow]);

    const handleSetFrequency = (minutes: number) => {
        setFrequency(minutes);
        localStorage.setItem('autoRefreshFrequency', minutes.toString());

        // If turning on, maybe triggering an immediate refresh isn't necessary, 
        // but users might expect it "working". Let's leave it to the interval.
    };

    return (
        <AutoRefreshContext.Provider
            value={{
                frequency,
                setFrequency: handleSetFrequency,
                lastRefreshed,
                isRefreshing,
                refreshNow,
            }}
        >
            {children}
        </AutoRefreshContext.Provider>
    );
}
