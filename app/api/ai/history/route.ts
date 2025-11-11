import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisHistory, getAnalysisById } from '../../../../lib/aiAnalysisCache';

export const runtime = 'nodejs';

// GET /api/ai/history - Get analysis history
// Query params: mode, symbol, limit, id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') as 'stock' | 'portfolio' | 'market' | null;
    const symbol = searchParams.get('symbol') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');
    const id = searchParams.get('id') || undefined;

    // If ID is provided, fetch specific analysis
    if (id) {
      const analysis = await getAnalysisById(id);
      
      if (!analysis) {
        return NextResponse.json(
          { success: false, error: 'Analysis not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        analysis,
      });
    }

    // Otherwise, fetch history list
    const history = await getAnalysisHistory(
      mode || undefined,
      symbol,
      limit
    );

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analysis history' },
      { status: 500 }
    );
  }
}

