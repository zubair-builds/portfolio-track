import { Metadata } from 'next';
import TransactionsClient from './TransactionsClient';
import { PAGE_TITLE_SUFFIX } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Transactions${PAGE_TITLE_SUFFIX}`,
};

export default function TransactionsPage() {
  return <TransactionsClient />;
}
