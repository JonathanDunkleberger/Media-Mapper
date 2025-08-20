// Server-only helper for TMDB (v4 bearer token only)
import { envServer } from './env.server';
import { fetchJSON, HttpError } from './http';

const TMDB_V4 = envServer.TMDB_V4_TOKEN; // long JWT-like token (Bearer)

function authHeaders() { return { Authorization: `Bearer ${TMDB_V4}` } as Record<string, string>; }

export async function tmdbJson<T = unknown>(path: string, searchParams?: Record<string, string>) {
  const base = 'https://api.themoviedb.org/3';
  const url = new URL(`${base}${path}`);
  if (searchParams) Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  const finalUrl = url.toString();
  try {
    return await fetchJSON<T>(finalUrl, { headers: authHeaders(), cache: 'no-store' });
  } catch (e) {
    if (e instanceof HttpError) throw new Error(`TMDB ${e.status}: ${e.body}`);
    throw e;
  }
}

export function tmdbImage(path: string | null | undefined, size: string = 'w300') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
