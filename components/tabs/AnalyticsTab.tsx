'use client';

import { SectionTitle } from '../ui/SectionTitle';
import PortfolioAnalytics from '../PortfolioAnalytics';

interface AnalyticsTabProps {
  userEmail?: string;
}

export default function AnalyticsTab({ userEmail }: AnalyticsTabProps) {
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title="Portfolio Analytics"
          description="Key metrics and diversification insights"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <PortfolioAnalytics userEmail={userEmail} />
      </section>
    </div>
  );
}

