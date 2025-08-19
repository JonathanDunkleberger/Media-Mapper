import { NextResponse } from 'next/server';
import { getTmdbMovieGenres, getTmdbTvGenres, getAnimeGenres, getIgdbGenres, getBookSubjects } from '@/lib/genres';

export const revalidate = 86400;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cat = url.searchParams.get('cat');
  let items: { id: string; label: string }[] = [];
  try {
    switch (cat) {
      case 'movie': items = await getTmdbMovieGenres(); break;
      case 'tv': items = await getTmdbTvGenres(); break;
      case 'anime': items = await getAnimeGenres(); break;
      case 'game': items = await getIgdbGenres(); break;
      case 'book': items = await getBookSubjects(); break;
      default: items = [];
    }
    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'genre error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
