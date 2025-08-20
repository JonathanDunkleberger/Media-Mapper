import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Clone the request headers and set a new header `x-version`
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-version', '1');

  // You can also set request headers in NextResponse.rewrite
  const response = NextResponse.next({
    request: {
      // New request headers
      headers: requestHeaders,
    },
  });

  // Diagnostics header for tracing
  if (!response.headers.get('x-request-id')) {
    response.headers.set('x-request-id', crypto.randomUUID());
  }
  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*'); // Or your specific domain
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  // Apply middleware to all paths except those starting with /api/
  matcher: ['/((?!api/).*)'],
};
