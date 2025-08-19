import { NextResponse } from 'next/server';
import { tmdbJson } from '@/lib/tmdb';
import { mapTV, TMDBTV } from '@/lib/map';

export const revalidate = 300;

interface TMDBTvWithGenres extends TMDBTV { genre_ids?: number[] }
interface TMDBResp { results?: TMDBTvWithGenres[] }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Math.max(Number(searchParams.get('take')) || 60, 1), 100);
  const page = Math.min(Math.max(Number(searchParams.get('page')) || 1, 1), 20);
  const mode = (searchParams.get('mode') || 'popular') as 'popular' | 'trending' | 'top_rated';
  const genres = searchParams.get('genres');
  try {
    const collected: TMDBTV[] = [];
    let curPage = page;
    const baseSort = mode === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
    if (mode === 'trending' && !genres) {
      while (collected.length < take && curPage < page + 5) {
        const data = await tmdbJson<TMDBResp>('/trending/tv/day', { page: String(curPage) });
        collected.push(...(data.results || []));
        if (!data.results || data.results.length < 20) break;
        curPage++;
      }
    } else {
      while (collected.length < take && curPage < page + 5) {
        const params: Record<string,string> = {
          sort_by: baseSort,
          page: String(curPage),
          language: 'en-US'
        };
        if (genres) params.with_genres = genres;
        if (mode === 'top_rated') params['vote_count.gte'] = '200';
        const data = await tmdbJson<TMDBResp>('/discover/tv', params);
        collected.push(...(data.results || []));
        if (!data.results || data.results.length < 20) break;
        curPage++;
      }
    }
    let list: TMDBTvWithGenres[] = collected as TMDBTvWithGenres[];
    if (genres && mode === 'trending') {
      const genreSet = new Set(genres.split(','));
      list = list.filter(m => m.genre_ids?.some(g => genreSet.has(String(g))));
    }
  const headers = new Headers();
  headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  return NextResponse.json({ items: mapTV(list).slice(0, take) }, { headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed to load';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
