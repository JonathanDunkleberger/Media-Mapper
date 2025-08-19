import { NextResponse } from 'next/server';
import { tmdbJson, tmdbImage } from '@/lib/tmdb';

interface TMDBMovie { id: number; title?: string; poster_path?: string | null; }

export async function GET() {
  try {
    const data = await tmdbJson<{ results?: TMDBMovie[] }>(`/trending/movie/week`);
    const movies = (data.results || []).slice(0, 20).map(m => ({
      id: m.id,
      title: m.title || 'Untitled',
      poster: tmdbImage(m.poster_path, 'w300')
    }));
    return NextResponse.json({ results: movies });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed to load';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
