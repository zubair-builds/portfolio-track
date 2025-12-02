'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import ProfessionalHeader from '@/components/ProfessionalHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export default function EmailsPage() {
  const { user, initializing, signout } = useAuth();
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  //'from:einfo@cdspak.com.pk subject:"eAlert - Movement of Securities against Market Trade: Executed on"'
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/signin');
    }
  }, [initializing, user, router]);

  useEffect(() => {
    if (user) {
      fetchEmails();
    }
  }, [user]);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`/api/gmail/messages?maxResults=50${queryParam}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails');
      }

      setEmails(data.messages || []);
      setTotalResults(data.totalResults || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signout();
    router.replace('/signin');
  };

  if (initializing || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ProfessionalHeader user={user} onSignOut={handleSignOut} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Gmail Messages
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {totalResults > 0 && `Found: ${totalResults} emails`}
              </p>
            </div>
            <Button onClick={fetchEmails} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails (e.g., from:sender@example.com, subject:test)"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchEmails();
                }
              }}
            />
            <Button onClick={fetchEmails} disabled={loading}>
              Search
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
            <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
            {error.includes('reconnect') && (
              <a
                href="/api/auth/google"
                className="mt-2 inline-block text-sm font-medium text-rose-600 hover:text-rose-500 dark:text-rose-400"
              >
                Reconnect Google Account
              </a>
            )}
          </Card>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse p-6">
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div className="mt-4 h-3 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
              </Card>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-600 dark:text-slate-400">No emails found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => (
              <Card key={email.id} className="p-6 transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {email.subject}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      From: {email.from}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      {email.date}
                    </p>
                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                      {email.snippet}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
