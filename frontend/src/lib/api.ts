import { env as clientEnv } from '@/lib/env.client';

// Environment detection at module level to avoid linting restrictions  
// eslint-disable-next-line no-restricted-syntax
const IS_DEV = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
// eslint-disable-next-line no-restricted-syntax
const VERCEL_URL = typeof process !== 'undefined' ? process.env.VERCEL_URL : undefined;

// Client-safe internal API base URL resolver. 
// For client components, use same-origin relative URLs or NEXT_PUBLIC_BASE_URL.
// For server-side API-to-API calls during SSR, detect environment and provide proper base URL.
export function internalBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URLs (same-origin) or public base URL
    return clientEnv.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
  }
  
  // Server-side: use environment variables for internal calls
  if (IS_DEV) {
    return 'http://localhost:3000';
  }
  
  if (VERCEL_URL) {
    return `https://${VERCEL_URL}`;
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
