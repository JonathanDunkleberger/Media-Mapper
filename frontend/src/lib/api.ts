import { envClient } from '@/lib/env.client';
// Client-safe internal base resolver (never imports server env)
export function internalBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return envClient.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
  }
  // On server fall back to same-origin relative (empty) unless explicit public base set
  return envClient.NEXT_PUBLIC_BASE_URL || '';
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
