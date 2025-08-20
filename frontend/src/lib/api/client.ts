import type { Api } from './types';
import { apiUrl } from '@/lib/api-base';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;
export type ApiQuery = Record<string, string | number | boolean | undefined>;

type Opts = RequestInit & { query?: ApiQuery };

function withQuery(path: string, q?: ApiQuery) {
  if (!q) return path;
  const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  for (const [k, v] of Object.entries(q)) if (v !== undefined) url.searchParams.set(k, String(v));
  const search = url.searchParams.toString();
  return url.pathname + (search ? `?${search}` : '');
}

async function handle<T>(res: Response): Promise<Api<T>> {
  const json = await res.json().catch(() => null);
  if (!json || typeof json.ok !== 'boolean') {
    return { ok: false, error: `Bad response (${res.status})` } as Api<T>;
  }
  return json as Api<T>;
}

export async function apiGet<T>(path: string, opts: Opts = {}): Promise<Api<T>> {
  const { query, ...init } = opts;
  // Allow callers to pass logical paths like 'popular/movies' or with leading '/api/'
  const logical = path.replace(/^\/*api\//, '').replace(/^\//, '');
  const url = withQuery(apiUrl(logical), query);
  try {
    const res = await fetch(url, {
      ...init,
      method: 'GET',
      headers: { Accept: 'application/json', ...(init.headers || {}) },
    });
    return handle<T>(res);
  } catch (e) {
    return { ok: false, error: 'Network error', details: e instanceof Error ? e.message : String(e) };
  }
}

export async function apiPost<T>(path: string, body: Json, opts: Opts = {}): Promise<Api<T>> {
  const { query, ...init } = opts;
  const logical = path.replace(/^\/*api\//, '').replace(/^\//, '');
  const url = withQuery(apiUrl(logical), query);
  try {
    const res = await fetch(url, {
      ...init,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers || {}) },
      body: JSON.stringify(body),
    });
    return handle<T>(res);
  } catch (e) {
    return { ok: false, error: 'Network error', details: e instanceof Error ? e.message : String(e) };
  }
}

export async function apiDelete<T>(path: string, opts: Opts = {}): Promise<Api<T>> {
  const { query, ...init } = opts;
  const logical = path.replace(/^\/*api\//, '').replace(/^\//, '');
  const url = withQuery(apiUrl(logical), query);
  try {
    const res = await fetch(url, {
      ...init,
      method: 'DELETE',
      headers: { Accept: 'application/json', ...(init.headers || {}) },
    });
    return handle<T>(res);
  } catch (e) {
    return { ok: false, error: 'Network error', details: e instanceof Error ? e.message : String(e) };
  }
}
