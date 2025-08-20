import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  try {
    const id = crypto.randomUUID();
    res.headers.set('x-request-id', id);
  } catch {
    // ignore
  }
  return res;
}
