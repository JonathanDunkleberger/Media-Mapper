import { NextResponse } from 'next/server';
import { tmdbJson } from '@/lib/tmdb';
import { igdb, IGDBGameRaw } from '@/lib/igdb';
import { booksSearch, GoogleVolumeRaw } from '@/lib/books';
import { mapMovies, mapTV, mapGamesIGDB, mapBooksGoogle, TMDBMovie, TMDBTV } from '@/lib/map';
import type { MediaItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';
  if (!q) return NextResponse.json({ items: [] });
  const abort = new AbortController();
  const tasks: Promise<MediaItem[]>[] = [];
  // TMDB multi
  tasks.push((async () => {
    try {
      const data = await tmdbJson<{ results?: (TMDBMovie & TMDBTV & { media_type?: string })[] }>(`/search/multi`, { query: q });
      const arr = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
      const movies = mapMovies(arr.filter(a => a.media_type === 'movie'));
      const tv = mapTV(arr.filter(a => a.media_type === 'tv'));
      return [...movies, ...tv];
    } catch { return []; }
  })());
  // IGDB games search
  tasks.push((async () => {
    try {
      const body = `search "${q}"; fields name,cover.image_id,first_release_date; limit 10;`;
  const data = await igdb<IGDBGameRaw>('games', body);
      return mapGamesIGDB(data);
    } catch { return []; }
  })());
  // Google Books
  tasks.push((async () => {
    try {
      const vols = await booksSearch(q, 10);
  return mapBooksGoogle(vols as GoogleVolumeRaw[]);
    } catch { return []; }
  })());

  try {
    const resultsSets = await Promise.all(tasks);
    const flat = resultsSets.flat();
    // simple dedupe
    const seen = new Set<string>();
    const merged: MediaItem[] = [];
    for (const it of flat) {
      const k = `${it.type}:${it.id}`;
      if (!seen.has(k)) { seen.add(k); merged.push(it); }
    }
    return NextResponse.json({ items: merged.slice(0, 12) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'search failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    abort.abort();
  }
}
