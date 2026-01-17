import { Metadata } from 'next';
import { Suspense } from 'react';
import DashboardClient from './DashboardClient';
import { PAGE_TITLE_SUFFIX } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Dashboard${PAGE_TITLE_SUFFIX}`,
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
          <p className="text-lg font-medium">Loading dashboard…</p>
        </div>
      </div>
    }>
      <DashboardClient />
    </Suspense>
  );
}
