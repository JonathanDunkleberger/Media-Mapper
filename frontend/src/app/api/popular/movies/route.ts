import { NextResponse } from 'next/server';
import { tmdbJson } from '@/lib/tmdb';
import { mapMovies, TMDBMovie } from '@/lib/map';

export const revalidate = 300; // short cache; paging handled dynamically

interface TMDBMovieWithGenres extends TMDBMovie { genre_ids?: number[] }
interface TMDBResp { results?: TMDBMovieWithGenres[] }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Math.max(Number(searchParams.get('take')) || 60, 1), 100);
  const page = Math.min(Math.max(Number(searchParams.get('page')) || 1, 1), 20);
  const mode = (searchParams.get('mode') || 'popular') as 'popular' | 'trending' | 'top_rated';
  const genres = searchParams.get('genres');
  try {
    const collected: TMDBMovie[] = [];
    let curPage = page;
    const baseSort = mode === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
    if (mode === 'trending' && !genres) {
      // trending endpoint (cannot filter genres server-side). If genres requested we fallback to discover.
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
      // client-side filter for trending+genres
      const genreSet = new Set(genres.split(','));
      list = list.filter(m => m.genre_ids?.some(g => genreSet.has(String(g))));
    }
    return NextResponse.json({ items: mapMovies(list).slice(0, take) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed to load';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
