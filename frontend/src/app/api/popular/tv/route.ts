import { z } from 'zod';
import { fetchJSON } from '@/lib/upstream';
import { env } from '@/lib/env.server';
import { mapTV, TMDBTV } from '@/lib/map';
import { createJsonRoute } from '@/lib/api/route-factory';

interface TMDBTvWithGenres extends TMDBTV { genre_ids?: number[] }
interface TMDBResp { results?: TMDBTvWithGenres[] }

const Query = z.object({
  take: z.coerce.number().int().min(1).max(100).default(60),
  page: z.coerce.number().int().min(1).max(20).default(1),
  mode: z.enum(['popular','trending','top_rated']).default('popular'),
  genres: z.string().optional(),
});

export const GET = createJsonRoute({
  schema: Query,
  cacheSeconds: 300,
  async run({ query }) {
    const { take, page, mode, genres } = query;
    const collected: TMDBTV[] = [];
    let curPage = page;
    const baseSort = mode === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
    const apiKey = env.TMDB_API_KEY || env.TMDB_V4_TOKEN;
    if (!apiKey) {
      return [];
    }
    let fetchError = null;
    if (mode === 'trending' && !genres) {
      while (collected.length < take && curPage < page + 5) {
        const url = `https://api.themoviedb.org/3/trending/tv/day?page=${curPage}&language=en-US`;
        const data = await fetchJSON(url, { headers: { Authorization: `Bearer ${apiKey}` } }, 'tmdb-tv');
        if (!data.ok) { fetchError = data; break; }
        collected.push(...(data.data?.results || []));
        if (!data.data?.results || data.data.results.length < 20) break;
        curPage++;
      }
    } else {
      while (collected.length < take && curPage < page + 5) {
        const params = new URLSearchParams({
          sort_by: baseSort,
          page: String(curPage),
          language: 'en-US',
        });
        if (genres) params.set('with_genres', genres);
        if (mode === 'top_rated') params.set('vote_count.gte', '200');
        const url = `https://api.themoviedb.org/3/discover/tv?${params.toString()}`;
        const data = await fetchJSON(url, { headers: { Authorization: `Bearer ${apiKey}` } }, 'tmdb-tv');
        if (!data.ok) { fetchError = data; break; }
        collected.push(...(data.data?.results || []));
        if (!data.data?.results || data.data.results.length < 20) break;
        curPage++;
      }
    }
    if (fetchError) return fetchError;
    let list: TMDBTvWithGenres[] = collected as TMDBTvWithGenres[];
    if (genres && mode === 'trending') {
      const genreSet = new Set(genres.split(','));
      list = list.filter(m => m.genre_ids?.some(g => genreSet.has(String(g))));
    }
    return mapTV(list).slice(0, take);
  }
});

export const runtime = "nodejs";
export const revalidate = 0;
