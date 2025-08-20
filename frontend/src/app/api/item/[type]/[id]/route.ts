import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createJsonRoute } from '@/lib/api/route-factory';
import { tmdbJson } from '@/lib/tmdb.server';
import { igdb, igdbCoverUrl, IGDBGameRaw } from '@/lib/igdb';
import { booksGet, booksSimilar, GoogleVolumeRaw } from '@/lib/books';
import { mapGamesIGDB, mapBooksGoogle } from '@/lib/map';
import { tmdbPosterUrl } from '@/lib/images';
import type { MediaDetail } from '@/lib/types';

type RawParams = { [k: string]: string | string[] | undefined };

interface TmdbCompany { name?: string }
interface TmdbGenre { name?: string }
interface TmdbCore {
  id: number;
  title?: string;
  name?: string;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  production_companies?: TmdbCompany[];
  genres?: TmdbGenre[];
  vote_average?: number;
  success?: boolean;
}

const Params = z.object({ type: z.enum(['movie','tv','game','book']), id: z.string() });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(_req: Request, ctx: any) {
  const { type, id } = Params.parse(ctx.params);
  try {
    if (type === 'movie' || type === 'tv') {
      const raw = await tmdbJson<TmdbCore>(`/${type}/${id}`);
    if (!raw || raw.success === false) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const title = raw.title ?? raw.name ?? 'Untitled';
    const yearRaw = raw.release_date || raw.first_air_date;
    const year = yearRaw ? new Date(yearRaw).getFullYear() : null;
    const detail: MediaDetail = {
      id: raw.id,
      type: type as 'movie' | 'tv',
      title,
      year,
  posterUrl: tmdbPosterUrl(raw.poster_path, 'w500'),
  sublabel: `${(typeof type === 'string' && type ? type.toUpperCase() : 'MEDIA')}${year ? ` • ${year}` : ''}`,
      overview: raw.overview ?? null,
  studios: (raw.production_companies ?? []).map(c => c.name).filter((n): n is string => Boolean(n)),
  genres: (raw.genres ?? []).map(g => g.name).filter((n): n is string => Boolean(n)),
      rating: raw.vote_average ? [{ source: 'tmdb', score: Number(raw.vote_average) }] : [],
      similar: []
    };
    // fetch similar items (movies/tv only)
    if (type === 'movie' || type === 'tv') {
      interface TmdbSimilar { id: number; title?: string; name?: string; poster_path?: string | null; release_date?: string; first_air_date?: string }
      try {
        const sim = await tmdbJson<{ results?: TmdbSimilar[] }>(`/${type}/${id}/similar`);
        const items = (sim.results ?? []).slice(0, 20).map(r => {
          const dateStr = r.release_date || r.first_air_date || null;
          const yearVal = dateStr ? new Date(dateStr).getFullYear() : null;
          return {
            id: r.id,
            type: (r.title ? 'movie' : 'tv') as 'movie' | 'tv',
            title: (r.title ?? r.name ?? 'Untitled') as string,
            year: yearVal,
            posterUrl: r.poster_path ? tmdbPosterUrl(r.poster_path, 'w300') : null,
            sublabel: `${r.title ? 'MOVIE' : 'TV'}${yearVal ? ` • ${yearVal}` : ''}`,
          };
        });
        detail.similar = items;
      } catch {}
    }
      {
        const headers = new Headers();
        headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  return NextResponse.json({ ok: true, data: detail }, { headers });
      }
    }
    if (type === 'game') {
      // fetch game
      const body = `fields name,cover.image_id,first_release_date,genres.name,summary,similar_games,platforms.name,screenshots.image_id; where id = ${id};`;
  const rows = await igdb<IGDBGameRaw>('games', body);
      const g = rows[0];
      if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const year = g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null;
      const detail: MediaDetail = {
        id: g.id,
        type: 'game',
        title: g.name || 'Untitled',
        year,
        posterUrl: igdbCoverUrl(g.cover?.image_id),
        sublabel: `GAME${year ? ` • ${year}` : ''}`,
        overview: g.summary || null,
  genres: (g.genres || []).map((x: { name?: string }) => x?.name).filter((n): n is string => Boolean(n)),
        studios: undefined,
        rating: [],
        similar: []
      };
      if (Array.isArray(g.similar_games) && g.similar_games.length) {
        try {
          const simBody = `fields name,cover.image_id,first_release_date; where id = (${g.similar_games.slice(0,20).join(',')});`;
            const sim = await igdb<IGDBGameRaw>('games', simBody);
          detail.similar = mapGamesIGDB(sim);
        } catch {}
      }
      {
        const headers = new Headers();
        headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  return NextResponse.json({ ok: true, data: detail }, { headers });
      }
    }
    if (type === 'book') {
      const vol = await booksGet(String(id));
      if (!vol) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const vi = vol.volumeInfo || {};
      const yearStr = vi.publishedDate?.slice(0,4) || null;
      const year = yearStr && /\d{4}/.test(yearStr) ? Number(yearStr) : null;
      const img = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || null;
      const detail: MediaDetail = {
        id: vol.id,
        type: 'book',
        title: vi.title || 'Untitled',
        year,
        posterUrl: img || null,
        sublabel: `BOOK${year ? ` • ${year}` : ''}`,
        overview: vi.description || null,
        genres: vi.categories || [],
        rating: [],
        similar: []
      };
      try {
  const sim = await booksSimilar(vol, 12);
  detail.similar = mapBooksGoogle(sim as GoogleVolumeRaw[]);
      } catch {}
      {
        const headers = new Headers();
        headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return NextResponse.json({ ok: true, data: detail }, { headers });
      }
    }
  } catch {
  return NextResponse.json({ ok: false, error: 'Fetch failed' }, { status: 500 });
  }
}
