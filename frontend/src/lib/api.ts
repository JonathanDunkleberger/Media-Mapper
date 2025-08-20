import { envServer } from '@/lib/env.server';
import { env as clientEnv } from '@/lib/env.client';
// Internal API base URL resolver that is safe on both server & client.
export function internalBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return clientEnv.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
  }
  if (envServer.VERCEL_URL) return `https://${envServer.VERCEL_URL}`;
  return clientEnv.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
