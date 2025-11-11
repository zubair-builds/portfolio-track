'use client';

import { SectionTitle } from '../ui/SectionTitle';
import PortfolioAllocation from '../PortfolioAllocation';
import { Stock } from '../../lib/portfolioData';

interface AllocationTabProps {
  stocks: Stock[];
  isLoading: boolean;
}

export default function AllocationTab({ stocks, isLoading }: AllocationTabProps) {
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title="Portfolio Allocation"
          description="How your investments are distributed"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          }
        />
        
        <PortfolioAllocation stocks={stocks} isLoading={isLoading} />
      </section>
    </div>
  );
}

