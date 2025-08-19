// Internal API fetch helper constructing an absolute URL for SSR/Edge.
// Prioritizes Vercel-provided deployment URL; otherwise falls back to localhost.
export function internalBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
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
