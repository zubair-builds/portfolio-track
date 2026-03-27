import jwt, { JwtPayload } from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const TOKEN_NAME = 'auth_token';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable.');
  }
  return secret;
}

function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parsed = parseCookie(cookieHeader);
  return parsed[TOKEN_NAME] || null;
}

export interface CustomJwtPayload extends JwtPayload {
  user: {
    email: string;
    name: string;
    role?: string;
  };
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '7d', // Token expires in 7 days
  });
}

export function verifyToken(token: string): CustomJwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as CustomJwtPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(payload: object): Promise<void> {
  const token = generateToken({ user: payload });
  const cookieStore = await cookies();

  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

export async function getUserFromCookies(): Promise<CustomJwtPayload['user'] | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME);

  if (!token) return null;

  const decoded = verifyToken(token.value);
  return decoded ? decoded.user : null;
}

export function getUserFromRequest(request: NextRequest | Request): CustomJwtPayload['user'] | null {
  const cookieToken = 'cookies' in request
    ? request.cookies.get(TOKEN_NAME)?.value ?? null
    : getTokenFromCookieHeader(request.headers.get('cookie'));

  if (cookieToken) {
    const decoded = verifyToken(cookieToken);
    if (decoded) return decoded.user;
  }

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (bearerToken) {
    const decoded = verifyToken(bearerToken);
    if (decoded) return decoded.user;
  }

  return null;
}

