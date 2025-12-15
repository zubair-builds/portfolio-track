import { Metadata } from 'next';
import DividendsClient from './DividendsClient';
import { PAGE_TITLE_SUFFIX } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Dividends${PAGE_TITLE_SUFFIX}`,
};

export default function DividendsPage() {
  return <DividendsClient />;
}
