import { NextResponse } from 'next/server';
import { igdb, IGDBGameRaw } from '@/lib/igdb';
import { mapGamesIGDB } from '@/lib/map';
export const revalidate = 300;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Math.max(Number(searchParams.get('take')) || 60, 1), 100);
  const page = Math.min(Math.max(Number(searchParams.get('page')) || 1, 1), 20);
  const mode = (searchParams.get('mode') || 'popular') as 'popular' | 'top_rated';
  const genres = searchParams.get('genres');
  try {
    const offset = (page - 1) * take;
    const whereParts = [ 'first_release_date != null' ];
    if (mode === 'top_rated') whereParts.push('rating_count != null', 'total_rating != null');
    if (genres) whereParts.push(`genres = (${genres})`);
    const whereClause = whereParts.length ? `where ${whereParts.join(' & ')};` : '';
    const sort = mode === 'top_rated' ? 'total_rating desc' : 'rating_count desc';
    const body = `fields name,cover.image_id,first_release_date,total_rating,rating_count,genres; sort ${sort}; ${whereClause} limit ${take}; offset ${offset};`;
    const data = await igdb<IGDBGameRaw>('games', body);
    return NextResponse.json({ items: mapGamesIGDB(data) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
