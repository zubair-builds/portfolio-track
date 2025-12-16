import { Metadata } from 'next';
import SettingsClient from './SettingsClient';
import { PAGE_TITLE_SUFFIX } from '@/lib/constants';

export const metadata: Metadata = {
    title: `Settings${PAGE_TITLE_SUFFIX}`,
};

export default function SettingsPage() {
    return <SettingsClient />;
}
