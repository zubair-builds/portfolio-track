import { Metadata } from 'next';
import IndicesClient from './IndicesClient';
import { PAGE_TITLE_SUFFIX } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Market Indices${PAGE_TITLE_SUFFIX}`,
};

export default function IndicesPage() {
  return <IndicesClient />;
}
