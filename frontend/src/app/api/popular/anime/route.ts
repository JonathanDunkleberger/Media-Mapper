import { z } from 'zod';
import { fetchJSON } from '@/lib/upstream';
import { env } from '@/lib/env.server';
import { zRawMedia } from '@/lib/schemas/media';
import { processAnime } from '@/server/animeService';
import { createJsonRoute } from '@/lib/api/route-factory';

const Query = z.object({
  page: z.coerce.number().min(1).default(1),
  genres: z.string().optional(),
  mode: z.enum(['popular','trending','top_rated']).default('popular'),
  sort: z.enum(['popularity','top_rated']).default('popularity'),
});

function parseGenreIds(raw?: string): number[] {
  if (!raw) return [];
  return raw.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
}

interface DiscoverResp { results?: unknown[] }

export const GET = createJsonRoute({
  schema: Query,
  cacheSeconds: 300,
  async run({ query: qs }) {
    const selectedGenreIds = parseGenreIds(qs.genres);
    const take = 60;
    async function fetchPage(p: number) {
      const apiKey = env.TMDB_API_KEY || env.TMDB_V4_TOKEN;
      if (!apiKey) {
        return { movies: [], tv: [], error: 'TMDB API key missing' };
      }
      if (qs.mode === 'trending') {
        const [mv, tv] = await Promise.all([
          fetchJSON(`https://api.themoviedb.org/3/trending/movie/day?page=${p}&language=en-US`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          }, 'tmdb-movie'),
          fetchJSON(`https://api.themoviedb.org/3/trending/tv/day?page=${p}&language=en-US`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          }, 'tmdb-tv'),
        ]);
        if (!mv.ok) return { movies: [], tv: [], error: mv };
        if (!tv.ok) return { movies: [], tv: [], error: tv };
        return { movies: mv.data?.results || [], tv: tv.data?.results || [] };
      }
      const baseSort = qs.mode === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
      const genreParam = qs.genres ? qs.genres : '16';
      const params = new URLSearchParams({
        with_genres: genreParam,
        with_original_language: 'ja',
        sort_by: baseSort,
        language: 'en-US',
        page: String(p),
      });
      if (qs.mode === 'top_rated') params.set('vote_count.gte', '200');
      const [mv, tv] = await Promise.all([
        fetchJSON(`https://api.themoviedb.org/3/discover/movie?${params.toString()}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }, 'tmdb-movie'),
        fetchJSON(`https://api.themoviedb.org/3/discover/tv?${params.toString()}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }, 'tmdb-tv'),
      ]);
      if (!mv.ok) return { movies: [], tv: [], error: mv };
      if (!tv.ok) return { movies: [], tv: [], error: tv };
      return { movies: mv.data?.results || [], tv: tv.data?.results || [] };
    }
    const movies: unknown[] = [];
    const tv: unknown[] = [];
    let cur = qs.page;
    let fetchError = null;
    while ((movies.length + tv.length) < take && cur < qs.page + 5) {
      const result = await fetchPage(cur);
      if (result.error) {
        fetchError = result.error;
        break;
      }
      movies.push(...result.movies);
      tv.push(...result.tv);
      cur++;
    }
    if (fetchError) {
      return fetchError;
    }
    const moviesValidated = movies.map(r => zRawMedia.parse(r));
    const tvValidated = tv.map(r => zRawMedia.parse(r));
    const processed = processAnime(moviesValidated, tvValidated, {
      trending: qs.mode === 'trending',
      selectedGenreIds,
      sort: qs.sort,
      minVotesTopRated: 50,
    });
    return processed.slice(0, take);
  }
});

export const runtime = "nodejs";
export const revalidate = 0;
