import { env as clientEnv } from '@/lib/env.client';

// Client-safe internal API base URL resolver. 
// For client components, use same-origin relative URLs or NEXT_PUBLIC_BASE_URL.
// For server-side API-to-API calls during SSR, detect environment and provide proper base URL.
export function internalBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URLs (same-origin) or public base URL
    return clientEnv.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
  }
  
  // Server-side: try to determine the correct base URL for internal calls
  // In development, use localhost:3000
  // In production, use VERCEL_URL or public base URL
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // In production, try VERCEL_URL (available as regular env var, not requiring server validation)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fall back to public base URL or empty string for same-origin
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
