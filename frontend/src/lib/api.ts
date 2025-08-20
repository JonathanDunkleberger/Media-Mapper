import { env as clientEnv } from '@/lib/env.client';

// Client-safe internal API base URL resolver. 
// For client components, use same-origin relative URLs or NEXT_PUBLIC_BASE_URL.
// For server-side API-to-API calls, API routes should handle their own URL resolution.
export function internalBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URLs (same-origin) or public base URL
    return clientEnv.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
  }
  // Server-side (but called from client-accessible code): use public base URL
  return clientEnv.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
}

export async function fetchInternalAPI<T = unknown>(endpoint: string, init?: RequestInit): Promise<T> {
  const base = internalBaseUrl().replace(/\/$/, '');
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return res.text() as unknown as T;
}
