import { z } from 'zod';
import { fetchJSON } from '@/lib/upstream';
import { env } from '@/lib/env.server';
import { mapMovies, TMDBMovie } from '@/lib/map';
import { createJsonRoute } from '@/lib/api/route-factory';

interface TMDBMovieWithGenres extends TMDBMovie { genre_ids?: number[] }
interface TMDBResp { results?: TMDBMovieWithGenres[] }

const Query = z.object({
  take: z.coerce.number().int().min(1).max(100).default(60),
  page: z.coerce.number().int().min(1).max(20).default(1),
  mode: z.enum(['popular','trending','top_rated']).default('popular'),
  genres: z.string().optional(),
});

export const runtime = 'nodejs';

export const GET = createJsonRoute({
  schema: Query,
  cacheSeconds: 300,
  async run({ query }) {
    const { take, page, mode, genres } = query;
    const collected: TMDBMovie[] = [];
    let curPage = page;
    const baseSort = mode === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
    const apiKey = env.TMDB_API_KEY || env.TMDB_V4_TOKEN;
    if (!apiKey) {
      return [];
    }
    let fetchError = null;
    if (mode === 'trending' && !genres) {
      while (collected.length < take && curPage < page + 5) {
        const url = `https://api.themoviedb.org/3/trending/movie/day?page=${curPage}&language=en-US`;
        const data = await fetchJSON(url, { headers: { Authorization: `Bearer ${apiKey}` } }, 'tmdb-movie');
        if (!data.ok) { fetchError = data; break; }
        collected.push(...(data.data?.results || []));
        if (!data.data?.results || data.data.results.length < 20) break;
        curPage++;
      }
    } else {
      while (collected.length < take && curPage < page + 5) {
        const params = new URLSearchParams({
          sort_by: baseSort,
          include_adult: 'false',
          page: String(curPage),
          language: 'en-US',
        });
        if (genres) params.set('with_genres', genres);
        if (mode === 'top_rated') params.set('vote_count.gte', '200');
        const url = `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
        const data = await fetchJSON(url, { headers: { Authorization: `Bearer ${apiKey}` } }, 'tmdb-movie');
        if (!data.ok) { fetchError = data; break; }
        collected.push(...(data.data?.results || []));
        if (!data.data?.results || data.data.results.length < 20) break;
        curPage++;
      }
    }
    if (fetchError) return fetchError;
    let list: TMDBMovieWithGenres[] = collected as TMDBMovieWithGenres[];
    if (genres && mode === 'trending') {
      const genreSet = new Set(genres.split(','));
      list = list.filter(m => m.genre_ids?.some(g => genreSet.has(String(g))));
    }
    return mapMovies(list).slice(0, take);
  }
});
