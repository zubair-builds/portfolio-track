import { NextResponse } from 'next/server';

/**
 * Adds CORS headers to a NextResponse
 * Use this in API route handlers to ensure CORS headers are present
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
  );
  return response;
}

/**
 * Creates a NextResponse with CORS headers
 */
export function jsonWithCors(data: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(data, init);
  return addCorsHeaders(response);
}

