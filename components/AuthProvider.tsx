'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { normalizeUserInput, PublicUser } from '../lib/userModel';

interface AuthContextValue {
  user: PublicUser | null;
  initializing: boolean;
  signup: (input: { name: string; email: string; password: string }) => Promise<void>;
  signin: (input: { email: string; password: string }) => Promise<void>;
  signout: () => void;
}

const CURRENT_USER_KEY = 'portfolioTrack.currentUser';
const MIGRATION_FLAG = 'portfolioTrack.migration_v1_completed';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readCurrentUser(): PublicUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.name === 'string' && typeof parsed?.email === 'string') {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn('Failed to read current user, clearing cache.', error);
    window.localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

function persistCurrentUser(user: PublicUser | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // One-time cleanup: remove old localStorage cache
    if (typeof window !== 'undefined') {
      const migrationDone = window.localStorage.getItem(MIGRATION_FLAG);
      if (!migrationDone) {
        try {
          window.localStorage.removeItem('psx_stock_prices');
          window.localStorage.setItem(MIGRATION_FLAG, 'true');
          console.log('Migrated: Removed old localStorage price cache');
        } catch (error) {
          console.error('Migration error:', error);
        }
      }
    }

    // Check for existing user in localStorage first
    const current = readCurrentUser();
    if (current) {
      setUser(current);
      setInitializing(false);
      return;
    }

    // If no localStorage user, check server-side cookie (for OAuth users)
    fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            persistCurrentUser(data.user);
            setUser(data.user);
          }
        }
      })
      .catch((error) => {
        console.error('Auth check failed:', error);
      })
      .finally(() => {
        setInitializing(false);
      });
  }, []);

  const signup = useCallback(async ({ name, email, password }: { name: string; email: string; password: string }) => {
    const normalized = normalizeUserInput({ name, email, password });

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalized),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Unable to create account.' }));
      throw new Error(data?.message ?? 'Unable to create account.');
    }

    const data = (await response.json()) as { user: PublicUser };
    persistCurrentUser(data.user);
    setUser(data.user);
  }, []);

  const signin = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const normalized = normalizeUserInput({ name: '', email, password });

    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: normalized.email, password: normalized.password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Invalid email or password.' }));
      throw new Error(data?.message ?? 'Invalid email or password.');
    }

    const data = (await response.json()) as { user: PublicUser };
    persistCurrentUser(data.user);
    setUser(data.user);
  }, []);

  const signout = useCallback(() => {
    persistCurrentUser(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, signup, signin, signout }),
    [user, initializing, signup, signin, signout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

