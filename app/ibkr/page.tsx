import { Metadata } from 'next';
import IbkrClient from './IbkrClient';
import { PAGE_TITLE_SUFFIX } from '@/lib/constants';

export const metadata: Metadata = {
    title: `International${PAGE_TITLE_SUFFIX}`,
    description: 'Track your international stocks and ETFs portfolio',
};

export default function IbkrPage() {
    return <IbkrClient />;
}
