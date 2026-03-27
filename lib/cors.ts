import { NextResponse } from 'next/server';

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function getAllowedOrigins(): string[] {
  return ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Adds CORS headers to a NextResponse
 * Use this in API route handlers to ensure CORS headers are present
 */
export function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  const allowedOrigins = getAllowedOrigins();
  const selectedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  response.headers.set('Access-Control-Allow-Origin', selectedOrigin);
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-CSRF-Token'
  );
  response.headers.set('Vary', 'Origin');
  return response;
}

/**
 * Creates a NextResponse with CORS headers
 */
export function jsonWithCors(data: unknown, init?: ResponseInit, origin?: string | null): NextResponse {
  const response = NextResponse.json(data, init);
  return addCorsHeaders(response, origin);
}

