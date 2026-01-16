import { Metadata } from 'next';
import MutualFundsClient from './MutualFundsClient';
import { PAGE_TITLE_SUFFIX } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Mutual Funds${PAGE_TITLE_SUFFIX}`,
};

export default function MutualFundsPage() {
  return <MutualFundsClient />;
}
