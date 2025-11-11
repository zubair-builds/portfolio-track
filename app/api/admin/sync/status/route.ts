import { NextResponse } from 'next/server';
import { getSyncStatus } from '@/lib/syncProgressStore';

export async function GET() {
  try {
    const companiesStatus = await getSyncStatus('companies');
    const dividendsStatus = await getSyncStatus('dividends');
    const fundamentalsStatus = await getSyncStatus('fundamentals');

    return NextResponse.json({
      companies: companiesStatus,
      dividends: dividendsStatus,
      fundamentals: fundamentalsStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sync status' },
      { status: 500 }
    );
  }
}

