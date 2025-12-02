import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const redirectUri = process.env.GMAIL_CALLBACK_URL;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Google OAuth not configured' },
      { status: 500 }
    );
  }

  //https://www.googleapis.com/auth/gmail.readonly
  const scope = 'openid profile email';
  const responseType = 'code';
  const accessType = 'offline';
  const prompt = 'consent';

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', responseType);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('access_type', accessType);
  authUrl.searchParams.set('prompt', prompt);

  return NextResponse.redirect(authUrl.toString());
}
