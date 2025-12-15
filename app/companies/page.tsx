import { Metadata } from 'next';
import CompaniesClient from './CompaniesClient';
import { PAGE_TITLE_SUFFIX } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Companies${PAGE_TITLE_SUFFIX}`,
};

export default function CompaniesPage() {
  return <CompaniesClient />;
}
