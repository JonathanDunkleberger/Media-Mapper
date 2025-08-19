import { z } from 'zod';
import { tmdbJson } from '@/lib/tmdb';
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

export const runtime = 'edge';

export const GET = createJsonRoute({
  schema: Query,
  cacheSeconds: 300,
  async run({ query }) {
    const { take, page, mode, genres } = query;
    const collected: TMDBMovie[] = [];
    let curPage = page;
    const baseSort = mode === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
    if (mode === 'trending' && !genres) {
      while (collected.length < take && curPage < page + 5) {
        const data = await tmdbJson<TMDBResp>(`/trending/movie/day`, { page: String(curPage) });
        collected.push(...(data.results || []));
        if (!data.results || data.results.length < 20) break;
        curPage++;
      }
    } else {
      while (collected.length < take && curPage < page + 5) {
        const params: Record<string,string> = {
          sort_by: baseSort,
          include_adult: 'false',
          page: String(curPage),
          language: 'en-US'
        };
        if (genres) params.with_genres = genres;
        if (mode === 'top_rated') params['vote_count.gte'] = '200';
        const data = await tmdbJson<TMDBResp>('/discover/movie', params);
        collected.push(...(data.results || []));
        if (!data.results || data.results.length < 20) break;
        curPage++;
      }
    }
    let list: TMDBMovieWithGenres[] = collected as TMDBMovieWithGenres[];
    if (genres && mode === 'trending') {
      const genreSet = new Set(genres.split(','));
      list = list.filter(m => m.genre_ids?.some(g => genreSet.has(String(g))));
    }
    return mapMovies(list).slice(0, take);
  }
});
