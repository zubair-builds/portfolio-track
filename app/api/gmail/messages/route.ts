import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookies } from '@/lib/jwt';
import clientPromise from '@/lib/mongodb';
import { UserDocument } from '@/lib/userModel';

async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromCookies();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const users = db.collection<UserDocument>('users');

    const user = await users.findOne({ email: currentUser.email });
    if (!user || !user.googleAccessToken) {
      return NextResponse.json(
        { error: 'No Gmail access token found. Please reconnect your Google account.' },
        { status: 400 }
      );
    }

    let accessToken = user.googleAccessToken;

    // Check if token is expired and refresh if needed
    if (user.googleTokenExpiry && user.googleTokenExpiry < new Date()) {
      if (!user.googleRefreshToken) {
        return NextResponse.json(
          { error: 'Token expired and no refresh token available' },
          { status: 401 }
        );
      }

      console.log('[Gmail API] Refreshing expired access token');
      const tokenData = await refreshGoogleToken(user.googleRefreshToken);
      accessToken = tokenData.access_token;

      // Update token in database
      const newExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
      await users.updateOne(
        { email: currentUser.email },
        {
          $set: {
            googleAccessToken: accessToken,
            googleTokenExpiry: newExpiry,
          },
        }
      );
    }

    // Get maxResults and query from params
    const { searchParams } = request.nextUrl;
    const maxResults = Math.min(parseInt(searchParams.get('maxResults') || '10'), 100);
    const query = searchParams.get('q') || '';

    // Build Gmail API URL with optional search query
    let gmailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
    if (query) {
      gmailUrl += `&q=${encodeURIComponent(query)}`;
    }

    // Fetch emails from Gmail API
    const gmailResponse = await fetch(gmailUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.json();
      console.error('[Gmail API] Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch emails from Gmail' },
        { status: gmailResponse.status }
      );
    }

    const messagesData = await gmailResponse.json();
    const messageIds = messagesData.messages || [];

    // Fetch details for each message
    const messageDetails = await Promise.all(
      messageIds.slice(0, maxResults).map(async (msg: { id: string }) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!detailResponse.ok) {
          return null;
        }

        const detail = await detailResponse.json();
        const headers = detail.payload?.headers || [];
        
        return {
          id: detail.id,
          threadId: detail.threadId,
          subject: headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)',
          from: headers.find((h: any) => h.name === 'From')?.value || '',
          date: headers.find((h: any) => h.name === 'Date')?.value || '',
          snippet: detail.snippet,
        };
      })
    );

    return NextResponse.json({
      success: true,
      messages: messageDetails.filter(Boolean),
      totalResults: messagesData.resultSizeEstimate || 0,
    });
  } catch (error) {
    console.error('[Gmail API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
