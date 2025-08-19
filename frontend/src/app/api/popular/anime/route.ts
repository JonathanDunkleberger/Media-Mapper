import { z } from 'zod';
import { tmdbJson } from '@/lib/tmdb';
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
      if (qs.mode === 'trending') {
        const [mv, tv] = await Promise.all([
          tmdbJson<DiscoverResp>('/trending/movie/day', { page: String(p) }),
          tmdbJson<DiscoverResp>('/trending/tv/day', { page: String(p) })
        ]);
        return { movies: mv.results || [], tv: tv.results || [] };
      }
      const baseSort = qs.mode === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
      const genreParam = qs.genres ? qs.genres : '16';
      const params = {
        with_genres: genreParam,
        with_original_language: 'ja',
        sort_by: baseSort,
        language: 'en-US',
        page: String(p),
        ...(qs.mode === 'top_rated' ? { 'vote_count.gte': '200' } : {})
      } as Record<string,string>;
      const [mv, tv] = await Promise.all([
        tmdbJson<DiscoverResp>('/discover/movie', params),
        tmdbJson<DiscoverResp>('/discover/tv', params)
      ]);
      return { movies: mv.results || [], tv: tv.results || [] };
    }
    const movies: unknown[] = [];
    const tv: unknown[] = [];
    let cur = qs.page;
    while ((movies.length + tv.length) < take && cur < qs.page + 5) {
      const { movies: m, tv: t } = await fetchPage(cur);
      movies.push(...m);
      tv.push(...t);
      cur++;
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
