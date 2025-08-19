import { NextResponse } from 'next/server';

// Simple federated search across TMDB (movies + tv) with defensive parsing
// Supports query param: q (string), type (movie|tv|all)

interface TMDBResultBase { id: number; title?: string; name?: string; poster_path?: string; media_type?: string; }

async function fetchJsonSafe<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const type = (searchParams.get('type') || 'all').toLowerCase();
  if (!q) return NextResponse.json([], { status: 200 });
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server missing TMDB key' }, { status: 500 });
  }
  const encoded = encodeURIComponent(q);
  const endpoints: string[] = [];
  if (type === 'movie' || type === 'all') endpoints.push(`https://api.themoviedb.org/3/search/movie?query=${encoded}&api_key=${apiKey}`);
  if (type === 'tv' || type === 'all') endpoints.push(`https://api.themoviedb.org/3/search/tv?query=${encoded}&api_key=${apiKey}`);

  const resultsArrays = await Promise.all(endpoints.map(e => fetchJsonSafe<{ results?: TMDBResultBase[] }>(e)));
  const merged: TMDBResultBase[] = [];
  const seen = new Set<number>();
  for (const block of resultsArrays) {
    if (!block || !Array.isArray(block.results)) continue;
    for (const r of block.results) {
      if (!r || typeof r.id !== 'number') continue;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      merged.push({ ...r, media_type: r.media_type || (r.title ? 'movie' : 'tv') });
    }
  }
  // Normalize minimal shape consumed by client (it union merges with Algolia later)
  const simplified = merged.slice(0, 20).map(r => ({
    id: r.id,
    title: r.title || r.name || '',
    poster_path: r.poster_path || '',
    type: r.media_type === 'tv' ? 'tv' : 'movie'
  }));
  return NextResponse.json(simplified, { status: 200 });
}
