'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import ProfessionalHeader from '@/components/ProfessionalHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { parseTransaction, Transaction, Email } from '@/lib/emailParser';
import Tabs from '@/components/Tabs';
import TransactionBreakdownTable from '@/components/TransactionBreakdownTable';

const maxResults = 100

export default function EmailsPage() {
  const { user, initializing, signout } = useAuth();
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalResults, setTotalResults] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchQuery, setSearchQuery] = useState('from:einfo@cdspak.com.pk subject:"eAlert - Movement of Securities against Market Trade: Executed on"');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('chronological');

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/signin');
    }
  }, [initializing, user, router]);

  const fetchEmails = useCallback(async (pageToken: string | null = null) => {
    setLoading(true);
    setError(null);

    try {
      let queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
      if (pageToken) {
        queryParam += `&pageToken=${pageToken}`;
      }

      const response = await fetch(`/api/gmail/messages?maxResults=${maxResults}${queryParam}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails');
      }

      setEmails(data.messages || []);
      setTotalResults(data.totalResults || 0);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      // Reset pagination when search query changes (handled implicitly by dependency array mostly, 
      // but logic below ensures clean slate on initial load or user change)
      setPageHistory([]);
      setNextPageToken(null);
      fetchEmails();
    }
  }, [user, fetchEmails]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNextPage = () => {
    if (nextPageToken) {
      setPageHistory(prev => [...prev, nextPageToken]); // Add CURRENT page token before moving? 
      // Wait, standard Gmail API pagination: 
      // To go forward, we use nextPageToken returned from current page.
      // To go back, we need the token we used to get HERE.
      // So history should store the tokens used to reach previous pages.
      // Actually simpler: 
      // Page 1: token=null. Returns next=A.
      // Page 2: token=A. Returns next=B.
      // Page 3: token=B. Returns next=C.

      // When on Page 1 (history=[]), clicking Next:
      // - Add 'null' (or unique marker) to history? Or just push current token?
      // Let's store the token used to fetch the CURRENT view in history? No, that's complex.
      // Better: History stack contains the pageTokens for previous pages.
      // Page 1: History []. Current view fetched with null.
      // Click Next (nextPageToken=A): 
      // - Push current fetch token (null) to history? 
      // - Fetch with A.

      // Let's try this: History stores the tokens for pages 1..N-1.
      // Page 1: History [].
      // Click Next: History [null]. Fetch(A).
      // Page 2: History [null]. 
      // Click Next: History [null, 'A']. Fetch(B).

      // We need to know "current page's token" to push to history.
      // But we don't store "current page token" in state, we just fetch with it.
      // We can derive it? Or storing it is easier.

      // Let's just track the token stack associated with *previous* pages.
      // Implementation:
      // When moving NEXT: Push the *token used for this page* (or better, the *token that will be used for prev page*)
      // Actually, if we just store stack of tokens:
      // [] -> Page 1
      // [null] -> Page 2 (Back goes to null)
      // [null, A] -> Page 3 (Back goes to A)

      // Current token isn't explicitly stored, so we need to track "token for current page" to push it?
      // Getting complicated. Let's simpler approach:
      // History stack tracks tokens for *visited pages*.
      // When going Next, we push the `nextPageToken` to history? No, that's for the NEW page.

      // standard approach:
      // history = [token_for_page_1, token_for_page_2, ...]
      // active_index = 0

      // Let's stick to simple "Previous" stack.
      // We are on a page. We fetched it using `pageToken` argument (or null).
      // If we go Next, we need to save the `pageToken` we successfully used?
      // Or just save the whole stack of tokens.

      // Revised approach:
      // `pageHistory`: Array of tokens used to fetch previous pages. 
      // Initial: []
      // Fetch(null) -> success.
      // Click Next (next=A):
      // setPageHistory([...prev, null]); // Save 'null' as the token for Page 1
      // fetch(A);

      // Page 2 (fetched with A). 
      // Click Next (next=B):
      // setPageHistory([...prev, 'A']);
      // fetch(B);

      // Click Back (from Page 3, history is [null, 'A']):
      // const prevToken = history.pop(); // 'A'
      // fetch(prevToken);
      // setPageHistory(newHistory);

      // Wait, 'null' in history might be tricky if we use strict types. let's use undefined or null.

      // Correct logic:
      // We need to know what token generated the CURRENT view to push it to history?
      // No, we know the "next" token from the previous state?
      // Let's just store the stack of tokens that *start* each page.
      // Page 1: stack starts empty? Or `[null]`.
      // Let's say `pageTokens` = [null]. Current page index = 0.
      // Next: push `nextPageToken`. index++.
      // Prev: index--.
      // This allows arbitrary navigation if we kept all tokens, but linear is fine.

      // Let's go with: `pageHistory` stores the tokens of *previous* pages.
      // When entering Page 1, history is [].
      // When going to Page 2, push `null` (token for Page 1) to history.
      // When going to Page 3, push `A` (token for Page 2) to history.

      // But wait, `fetchEmails` is called with a token. We don't store the "current" token in a variable. 
      // We only have `nextPageToken` from the response.

      // We need to track the "current page's fetch token".
      // Let's add state `cronPageToken`.

    }
  };

  // Implementation detail: 
  // To avoid complex state, let's just pass the current page's token when clicking next.
  // But we don't have it easily available unless we store it.
  // We'll trust the history stack approach.

  // Refined approach:
  // History Stack: [token1, token2, ...] representing the path.
  // Current Page Token is NOT in the stack (or is the last one?). 
  // Let's say stack = path to get here.
  // Page 1: stack = []. Fetch(null).
  // Click Next (next=A): push `null` to stack. stack=[null]. Fetch(A).
  // Click Next (next=B): push `A` to stack. stack=[null, A]. Fetch(B).
  // Click Prev: pop stack (get A). stack=[null]. Fetch(A).

  // But how do we know 'A' is the current token to push when going Next from Page 2?
  // We don't. We only have 'B' (next) and history which has 'null'.
  // We are missing 'A'.
  // Checks out: We need to store `currentPageToken`.

  const [currentPageToken, setCurrentPageToken] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadNextPage = () => {
    if (nextPageToken) {
      setPageHistory(prev => [...prev, currentPageToken || '']);
      setCurrentPageToken(nextPageToken);
      fetchEmails(nextPageToken);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadPreviousPage = () => {
    if (pageHistory.length > 0) {
      const prevToken = pageHistory[pageHistory.length - 1];
      const newHistory = pageHistory.slice(0, -1);

      setPageHistory(newHistory);
      // treat empty string as null
      const realToken = prevToken === '' ? null : prevToken;
      setCurrentPageToken(realToken);
      fetchEmails(realToken);
    }
  };

  const handleRefresh = () => {
    // Reload current page
    fetchEmails(currentPageToken);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearch = () => {
    // Reset pagination on search
    setPageHistory([]);
    setCurrentPageToken(null);
    fetchEmails(null);
  };

  const [transactionPage, setTransactionPage] = useState(1);
  const TRANSACTIONS_PER_PAGE = 10;

  useEffect(() => {
    // Reset transaction page when emails (and thus transactions) change
    setTransactionPage(1);
  }, [emails]);

  const handleSignOut = async () => {
    await signout();
    router.replace('/signin');
  };

  const allTransactions = emails.flatMap(parseTransaction);
  const totalTransactions = allTransactions.length;
  const totalTransactionPages = Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE);

  const currentTransactions = allTransactions.slice(
    (transactionPage - 1) * TRANSACTIONS_PER_PAGE,
    transactionPage * TRANSACTIONS_PER_PAGE
  );

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
                Transaction emails
              </h1>
              {/*
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {totalResults > 0 && `Estimate: ${totalResults} emails`} • Page {pageHistory.length + 1}
              </p>
              */}
            </div>
            <div className="flex gap-2">

              {/*
                <Button onClick={() => loadPreviousPage()} disabled={loading || pageHistory.length === 0} variant="secondary">
                Previous
              </Button>
              <Button onClick={() => loadNextPage()} disabled={loading || !nextPageToken}>
                Next
              </Button>
*/}
              <Button onClick={handleRefresh} disabled={loading} variant="outline">
                {loading ? '...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/*
            <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails (e.g., from:sender@example.com, subject:test)"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch} disabled={loading}>
              Search
            </Button>
          </div>
          */}
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

        {/* Transactions Section */}
        {allTransactions.length > 0 && (
          <div className="mb-8">
            <div className="mb-6">
              <Tabs
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={[
                  {
                    id: 'chronological',
                    label: 'Timeline',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    badge: allTransactions.length
                  },
                  {
                    id: 'breakdown',
                    label: 'Company Breakdown',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    ),
                  }
                ]}
              />
            </div>

            {/* Chronological View */}
            {activeTab === 'chronological' && (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="px-6 py-3">#</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Company</th>
                        <th className="px-6 py-3">Shares</th>
                        <th className="px-6 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {currentTransactions.map((tx, index) => (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4">{(transactionPage - 1) * TRANSACTIONS_PER_PAGE + index + 1}</td>
                          <td className="whitespace-nowrap px-6 py-4">{tx.date}</td>
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{tx.company}</td>
                          <td className="px-6 py-4">{tx.shares}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tx.action === 'Buy'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                              {tx.action}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Transaction Pagination Controls */}
                {totalTransactionPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <Button
                        onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                        disabled={transactionPage === 1}
                        variant="secondary"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => setTransactionPage(p => Math.min(totalTransactionPages, p + 1))}
                        disabled={transactionPage === totalTransactionPages}
                      >
                        Next
                      </Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Showing <span className="font-medium">{(transactionPage - 1) * TRANSACTIONS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(transactionPage * TRANSACTIONS_PER_PAGE, totalTransactions)}</span> of <span className="font-medium">{totalTransactions}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                            onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                            disabled={transactionPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-slate-700 dark:hover:bg-slate-800"
                          >
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 focus:outline-offset-0 dark:text-slate-100 dark:ring-slate-700">
                            {transactionPage} / {totalTransactionPages}
                          </span>
                          <button
                            onClick={() => setTransactionPage(p => Math.min(totalTransactionPages, p + 1))}
                            disabled={transactionPage === totalTransactionPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-slate-700 dark:hover:bg-slate-800"
                          >
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Company Breakdown View */}
            {activeTab === 'breakdown' && (
              <TransactionBreakdownTable transactions={allTransactions} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

