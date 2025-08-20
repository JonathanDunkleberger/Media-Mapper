import { z } from 'zod';
import { tmdbJson } from '@/lib/tmdb.server';
import { igdb, IGDBGameRaw } from '@/lib/igdb';
import { booksSearch, GoogleVolumeRaw } from '@/lib/books';
import { mapMovies, mapTV, mapGamesIGDB, mapBooksGoogle, TMDBMovie, TMDBTV } from '@/lib/map';
import type { MediaItem } from '@/lib/types';
import { createJsonRoute } from '@/lib/api/route-factory';
import { searchMedia } from '@/lib/search';

const Query = z.object({
  q: z.string().trim().min(1),
});

const isStabilityMode = process.env.NEXT_PUBLIC_STABILITY_MODE === '1';
export const runtime = isStabilityMode ? 'nodejs' : 'edge';

export const GET = createJsonRoute({
  schema: Query,
  cacheSeconds: 60,
  async run({ query }) {
    const { q } = query;
    const tasks: Promise<MediaItem[]>[] = [];
    tasks.push((async () => {
      try {
        const data = await tmdbJson<{ results?: (TMDBMovie & TMDBTV & { media_type?: string })[] }>(`/search/multi`, { query: q });
        const arr = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
        const movies = mapMovies(arr.filter(a => a.media_type === 'movie'));
        const tv = mapTV(arr.filter(a => a.media_type === 'tv'));
        return [...movies, ...tv];
      } catch { return []; }
    })());
    tasks.push((async () => {
      try {
        const body = `search "${q}"; fields name,cover.image_id,first_release_date; limit 10;`;
        const data = await igdb<IGDBGameRaw>('games', body);
        return mapGamesIGDB(data);
      } catch { return []; }
    })());
    tasks.push((async () => {
      try {
        const vols = await booksSearch(q, 10);
        return mapBooksGoogle(vols as GoogleVolumeRaw[]);
      } catch { return []; }
    })());
    const resultsSets = await Promise.all(tasks);
    const flat = resultsSets.flat();
    const seen = new Set<string>();
    const merged: MediaItem[] = [];
    for (const it of flat) {
      const k = `${it.type}:${it.id}`;
      if (!seen.has(k)) { seen.add(k); merged.push(it); }
    }
    return merged.slice(0, 12);
  }
});
