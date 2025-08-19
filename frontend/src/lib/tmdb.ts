// Server-only helper for TMDB (supports v3 key or v4 bearer token)
import { env } from './env';
import { fetchJSON, HttpError } from './http';

const TMDB_V4 = env.TMDB_V4_TOKEN; // long JWT-like token (Bearer)
const TMDB_V3 = env.TMDB_API_KEY;  // short key, used as ?api_key=

function authHeaders() {
  if (TMDB_V4) return { Authorization: `Bearer ${TMDB_V4}` } as Record<string, string>;
  return {};
}

function withApiKey(url: string) {
  if (TMDB_V4) return url; // v4 doesn’t need query param
  if (!TMDB_V3) throw new Error('TMDB_API_KEY (v3) or TMDB_V4_TOKEN is required');
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}api_key=${TMDB_V3}`;
}

export async function tmdbJson<T = unknown>(path: string, searchParams?: Record<string, string>) {
  const base = 'https://api.themoviedb.org/3';
  const url = new URL(`${base}${path}`);
  if (searchParams) Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  const finalUrl = withApiKey(url.toString());
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
