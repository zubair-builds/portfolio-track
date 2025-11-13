import { NextRequest, NextResponse } from 'next/server';

// CORS headers to apply to preflight OPTIONS requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
  'Access-Control-Max-Age': '86400',
};

export function middleware(request: NextRequest) {
  // Handle CORS preflight (OPTIONS) requests for API routes
  // Regular requests get CORS headers from next.config.js headers()
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  
  if (pathname.startsWith('/api/') && method === 'OPTIONS') {
    const response = new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
    return response;
  }

  // For non-OPTIONS requests, pass through (headers from next.config.js will be applied)
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

