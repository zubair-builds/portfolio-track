import { Metadata } from 'next';
import DashboardClient from './DashboardClient';
import { PAGE_TITLE_SUFFIX } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Dashboard${PAGE_TITLE_SUFFIX}`,
};

export default function Page() {
  return <DashboardClient />;
}
