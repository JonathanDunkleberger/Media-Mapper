// Deprecated: internalBaseUrl. Use apiUrl for all internal API calls.

import { apiUrl } from '@/lib/apiUrl';

export async function fetchInternalAPI<T = unknown>(endpoint: string, init?: RequestInit): Promise<T> {
  const url = apiUrl(endpoint);
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return res.text() as unknown as T;
}
