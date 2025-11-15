import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../../lib/jwt';
import { getChatHistory } from '../../../../../lib/aiAnalysisCache';

export const runtime = 'nodejs';

// GET /api/ai/chat/history - Get chat history for authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    
    if (!user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1'); // Get most recent conversation by default

    const history = await getChatHistory(user.email, limit);

    // Return the most recent conversation's messages
    if (history.length > 0) {
      // Get the most recent conversation (first item after sorting by createdAt desc)
      const mostRecent = history[0];
      return NextResponse.json({
        success: true,
        messages: mostRecent.messages,
        context: mostRecent.context,
        createdAt: mostRecent.createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      messages: [],
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

