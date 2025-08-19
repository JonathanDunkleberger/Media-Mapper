// Server-only helper for TMDB (supports v3 key or v4 bearer token)
// Usage: set either TMDB_V4_TOKEN (preferred) OR TMDB_API_KEY in env (server-side only)

const TMDB_V4 = process.env.TMDB_V4_TOKEN; // long JWT-like token (Bearer)
const TMDB_V3 = process.env.TMDB_API_KEY;  // short key, used as ?api_key=

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
  const res = await fetch(finalUrl, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) {
    const sample = (await res.text()).slice(0, 200);
    throw new Error(`TMDB ${res.status}: ${sample}`);
  }
  return (await res.json()) as T;
}

export function tmdbImage(path: string | null | undefined, size: string = 'w300') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
