import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { UserDocument } from '@/lib/userModel';
import { setAuthCookie } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  console.log('[Google OAuth] Callback initiated');
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('[Google OAuth] Error in callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signin?error=access_denied`);
  }

  if (!code) {
    console.error('[Google OAuth] Missing authorization code');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signin?error=missing_code`);
  }

  console.log('[Google OAuth] Authorization code received');

  try {
    // Exchange code for tokens
    console.log('[Google OAuth] Exchanging code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        redirect_uri: process.env.GMAIL_CALLBACK_URL!,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('[Google OAuth] Token exchange failed:', tokenResponse.status);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresIn = tokens.expires_in;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    console.log('[Google OAuth] Access token received');

    // Fetch user info from Google
    console.log('[Google OAuth] Fetching user info from Google...');
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[Google OAuth] Failed to fetch user info:', userInfoResponse.status);
      throw new Error('Failed to fetch user info');
    }

    const googleUser = await userInfoResponse.json();
    const email = googleUser.email.trim().toLowerCase();
    const name = googleUser.name || googleUser.given_name || email.split('@')[0];
    console.log('[Google OAuth] User info received:', { email, name });

    // Get MongoDB connection
    console.log('[Google OAuth] Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
    const users = db.collection<UserDocument>('users');

    // Check if user exists
    console.log('[Google OAuth] Checking if user exists:', email);
    let user = await users.findOne({ email });

    if (!user) {
      // Create new user with Google OAuth
      console.log('[Google OAuth] Creating new user:', email);
      const now = new Date();
      const userDocument: UserDocument = {
        name,
        email,
        passwordHash: '', // No password for OAuth users
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        googleTokenExpiry: tokenExpiry,
        createdAt: now,
        updatedAt: now,
      };

      const result = await users.insertOne(userDocument);
      user = { ...userDocument, _id: result.insertedId };
      console.log('[Google OAuth] New user created successfully');
    } else {
      console.log('[Google OAuth] Existing user found:', email);
      // Update existing user with new tokens
      await users.updateOne(
        { email },
        {
          $set: {
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleTokenExpiry: tokenExpiry,
            updatedAt: new Date(),
          },
        }
      );
      user.googleAccessToken = accessToken;
      user.googleRefreshToken = refreshToken;
      user.googleTokenExpiry = tokenExpiry;
    }

    // Set auth cookie
    console.log('[Google OAuth] Setting auth cookie for:', user.email);
    await setAuthCookie({
      email: user.email,
      name: user.name,
    });

    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/`;
    console.log('[Google OAuth] Authentication successful! Redirecting to:', redirectUrl);
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signin?error=auth_failed`);
  }
}
