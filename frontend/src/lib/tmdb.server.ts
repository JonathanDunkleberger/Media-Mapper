import { env } from '@/lib/env.server';

function buildAuth(): Record<string, string> {
  if (env.TMDB_V4_TOKEN) return { Authorization: `Bearer ${env.TMDB_V4_TOKEN}` };
  if (env.TMDB_API_KEY) return { 'X-API-Key': env.TMDB_API_KEY };
  return {};
}

export async function tmdb<T>(path: string, init?: RequestInit & { timeoutMs?: number }) {
  const initHeaders: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => { initHeaders[k] = v; });
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) initHeaders[k] = v as string;
    } else {
      Object.assign(initHeaders, init.headers as Record<string, string>);
    }
  }
  const headers: Record<string, string> = { Accept: 'application/json', ...initHeaders, ...buildAuth() };
  const timeoutMs = init?.timeoutMs ?? 5000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(`https://api.themoviedb.org/3${path}`, {
      ...init,
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(id);
    const elapsed = Date.now() - started;
    // if (elapsed > 2000) {
    //   console.warn(`[tmdb] Slow request (${elapsed}ms): ${path}`);
    // }
    if (!res.ok) throw new Error(`TMDB ${res.status}`);
    return res.json() as Promise<T>;
  } catch (err) {
    if ((err as any).name === 'AbortError') {
      // console.error(`[tmdb] Timeout after ${timeoutMs}ms: ${path}`);
      throw new Error(`TMDB timeout after ${timeoutMs}ms: ${path}`);
    }
    // console.error(`[tmdb] Error: ${path}`, err);
    throw err;
  }
}

// Backwards-compatible helper matching previous tmdbJson signature that accepted searchParams map.
export async function tmdbJson<T = unknown>(path: string, searchParams?: Record<string, string>) {
  if (searchParams && Object.keys(searchParams).length) {
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
    const full = url.pathname + url.search; // re-use tmdb with path including query
    return tmdb<T>(full);
  }
  return tmdb<T>(path);
}
