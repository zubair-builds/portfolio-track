'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SyncControlPanel from '@/components/SyncControlPanel';
import SyncProgressDisplay from '@/components/SyncProgressDisplay';
import { ToastContainer, useToast } from '@/components/Toast';
import { useSyncEvents } from '@/hooks/useSyncEvents';

export default function AdminPage() {
  const router = useRouter();
  const { messages, showToast, closeToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const hasChecked = useRef(false);
  const { syncData, loading: syncLoading, error: syncError } = useSyncEvents();

  useEffect(() => {
    // Prevent multiple auth checks
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Check authentication
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        console.log('Auth check response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Auth check data:', data);
          
          // For now, we'll just check if user is logged in
          // In production, you'd check for admin role
          if (data.user) {
            console.log('User authenticated:', data.user.email);
            setIsAuthenticated(true);
          } else {
            console.log('No user found, redirecting to signin');
            setIsAuthenticated(false);
            showToast('Please sign in to access admin panel', 'error');
            setTimeout(() => router.replace('/signin'), 1500);
          }
        } else {
          console.log('Auth check failed with status:', response.status);
          setIsAuthenticated(false);
          showToast('Authentication failed', 'error');
          setTimeout(() => router.replace('/signin'), 1500);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        showToast('Authentication error', 'error');
        setTimeout(() => router.replace('/signin'), 1500);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, showToast]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  const handleNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    showToast(message, type);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer messages={messages} onClose={closeToast} />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage background data synchronization</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 text-xl">ℹ️</div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Background Sync System</h3>
                <p className="text-blue-800 text-sm">
                  This dashboard allows you to control the background synchronization of company fundamentals, 
                  dividend data, and symbol fundamentals from PSX. The sync runs with rate limiting and uses 
                  Server-Sent Events for real-time progress updates. Track execution time and resume after interruptions.
                </p>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <SyncControlPanel 
            onNotification={handleNotification}
            companiesStatus={syncData?.companies.status || null}
            dividendsStatus={syncData?.dividends.status || null}
            fundamentalsStatus={syncData?.fundamentals.status || null}
            loading={syncLoading}
            error={syncError}
          />

          {/* Progress Display */}
          <SyncProgressDisplay />

          {/* Additional Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">Companies Sync</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Fetches company fundamentals</li>
                  <li>• Rate limit: 1 request per 650ms</li>
                  <li>• Stores: marketCap, shares, freeFloat, etc.</li>
                  <li>• SSE real-time updates</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">Dividends Sync</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Fetches dividend history</li>
                  <li>• Rate limit: 1 request per 650ms</li>
                  <li>• Stores: ex-date, amount, year</li>
                  <li>• SSE real-time updates</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">Fundamentals Sync</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Fetches symbol fundamentals</li>
                  <li>• Rate limit: 1 request per 650ms</li>
                  <li>• Stores: sector, listedIn, PE, yield</li>
                  <li>• SSE real-time updates</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

