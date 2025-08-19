import { NextResponse } from 'next/server';
import { booksSearch, GoogleVolumeRaw } from '@/lib/books';
import { mapBooksGoogle } from '@/lib/map';
export const revalidate = 300;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Math.max(Number(searchParams.get('take')) || 60, 1), 60); // limit to 60 for books
  const page = Math.min(Math.max(Number(searchParams.get('page')) || 1, 1), 20);
  const mode = (searchParams.get('mode') || 'popular') as 'popular' | 'top_rated' | 'newest';
  const genresParam = searchParams.get('genres') || searchParams.get('subject') || 'fiction';
  const subjects = genresParam.split(',').map(s => s.trim()).filter(Boolean);
  try {
    const startIndex = (page - 1) * take;
    // Google Books API maxResults max 40; if take > 40 do two requests
    const order = mode === 'newest' ? 'newest' : 'relevance';
    const batch1 = await booksSearch(subjects, Math.min(take, 40), startIndex, order) as GoogleVolumeRaw[];
    let combined = batch1;
    if (take > 40) {
      const batch2 = await booksSearch(subjects, take - 40, startIndex + 40, order) as GoogleVolumeRaw[];
      combined = [...batch1, ...batch2];
    }
    return NextResponse.json({ items: mapBooksGoogle(combined) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
