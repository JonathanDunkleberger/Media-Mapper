import { NextResponse } from 'next/server';
import { tmdbJson } from '@/lib/tmdb';

interface SearchResult { id: number; title?: string; name?: string; poster_path?: string | null; media_type?: string; }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json([]);
  try {
    // Use multi search; it returns movies, tv, people—filter to movie/tv only
    const data = await tmdbJson<{ results?: SearchResult[] }>(`/search/multi`, { query: q });
    const results = (data.results || []).filter(r => r && (r.media_type === 'movie' || r.media_type === 'tv'));
    const simplified = results.slice(0, 30).map(r => ({
      id: r.id,
      title: r.title || r.name || '',
      poster_path: r.poster_path || '',
      type: r.media_type === 'tv' ? 'tv' : 'movie'
    }));
    return NextResponse.json(simplified);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'search failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
