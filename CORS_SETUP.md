# CORS Configuration Guide

This document explains how CORS (Cross-Origin Resource Sharing) is configured for the PortfolioTrack API to support cross-origin requests, including React Native apps running in browsers.

## Problem

When making API requests from a different origin (e.g., React Native app at `http://localhost:8081` calling Next.js API at `http://localhost:3000`), browsers enforce CORS policies. Without proper CORS headers, requests will fail with errors like:

```
Failed to Load Portfolio
CORS Error: Backend must handle OPTIONS preflight requests.
```

## Solution

We use a two-part approach to handle CORS:

1. **`next.config.js` headers()** - Adds CORS headers to all API responses
2. **`middleware.ts`** - Handles OPTIONS preflight requests

## Configuration Files

### 1. `next.config.js`

The `headers()` function adds CORS headers to all `/api/*` routes at the edge level:

```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-User-Id, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version' },
        { key: 'Access-Control-Max-Age', value: '86400' },
      ],
    },
  ];
}
```

### 2. `middleware.ts`

The middleware handles OPTIONS preflight requests that browsers send before actual requests:

```typescript
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
```

## Required CORS Headers

For the PortfolioTrack API to work with cross-origin requests, the following headers are required:

- **Access-Control-Allow-Origin**: `*` (allows all origins)
- **Access-Control-Allow-Methods**: `GET, POST, PUT, DELETE, PATCH, OPTIONS`
- **Access-Control-Allow-Headers**: Must include:
  - `Content-Type`
  - `X-User-Id` (used for authentication)
  - `Authorization` (for JWT tokens)
  - Other standard headers

## How It Works

1. **Preflight Requests (OPTIONS)**: 
   - Browser sends OPTIONS request before actual request
   - Middleware intercepts and returns 200 with CORS headers
   - Browser checks headers and proceeds with actual request if allowed

2. **Actual Requests (GET, POST, etc.)**:
   - Request goes through middleware (passes through for non-OPTIONS)
   - `next.config.js` headers() adds CORS headers to response
   - Browser receives response with CORS headers and allows access

## Troubleshooting

### Issue: CORS errors still occurring

1. **Restart the Next.js dev server** after making changes:
   ```bash
   # Stop server (Ctrl+C) and restart
   npm run dev
   ```

2. **Clear browser cache** or test in incognito mode to avoid cached CORS errors

3. **Check browser Network tab**:
   - Look for the OPTIONS preflight request
   - Verify it returns 200 status
   - Check response headers include CORS headers

4. **Verify headers match**:
   - Ensure `X-User-Id` is in `Access-Control-Allow-Headers` if your app uses it
   - Ensure all HTTP methods you use are in `Access-Control-Allow-Methods`

### Issue: Specific header not allowed

If you need to add a new custom header:

1. Add it to `Access-Control-Allow-Headers` in `middleware.ts`
2. Add it to `Access-Control-Allow-Headers` in `next.config.js`
3. Restart the server

### Issue: Need to allow specific origins instead of `*`

If you need to restrict to specific origins (e.g., for production):

1. Update middleware to check origin:
   ```typescript
   const allowedOrigins = [
     'http://localhost:3000',
     'http://localhost:8081',
     'https://yourdomain.com',
   ];
   
   const origin = request.headers.get('origin');
   const isAllowed = origin && allowedOrigins.includes(origin);
   
   if (isAllowed) {
     response.headers.set('Access-Control-Allow-Origin', origin);
   }
   ```

2. Note: When using specific origins, you cannot use `*` - you must return the exact origin from the request.

## Testing

To test CORS configuration:

1. Start Next.js server: `npm run dev`
2. Make a request from a different origin (e.g., React Native app, Postman with CORS enabled, or browser console)
3. Check Network tab for:
   - OPTIONS request returns 200
   - Actual request includes CORS headers in response
   - No CORS errors in console

## Notes

- `Access-Control-Allow-Origin: *` allows all origins but cannot be used with credentials
- If you need credentials support, use specific origins instead of `*`
- The `Access-Control-Max-Age: 86400` header tells browsers to cache preflight responses for 24 hours
- Both `middleware.ts` and `next.config.js` must have matching headers for consistency

