import jwt, { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_NAME = 'auth_token';

export interface CustomJwtPayload extends JwtPayload {
  user: {
    email: string;
    name: string;
  };
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });
}

export function verifyToken(token: string): CustomJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
  } catch (error) {
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

export function getUserFromRequest(request: NextRequest): CustomJwtPayload['user'] | null {
  const token = request.cookies.get(TOKEN_NAME);
  
  if (!token) return null;
  
  const decoded = verifyToken(token.value);
  return decoded ? decoded.user : null;
}

