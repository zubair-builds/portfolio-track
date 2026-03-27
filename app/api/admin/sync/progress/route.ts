import { NextResponse } from 'next/server';
import { getProgress } from '@/lib/syncProgressStore';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'companies' | 'dividends' | 'fundamentals' | null;

    if (!type || !['companies', 'dividends', 'fundamentals'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "companies", "dividends", or "fundamentals"' },
        { status: 400 }
      );
    }

    const progress = await getProgress(type);

    return NextResponse.json({
      type,
      progress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get progress:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sync progress' },
      { status: 500 }
    );
  }
}

