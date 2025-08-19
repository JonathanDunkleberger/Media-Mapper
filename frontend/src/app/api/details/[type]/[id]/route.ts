import { NextResponse } from 'next/server';
import { tmdbJson } from '@/lib/tmdb';
import { igdb, igdbCoverUrl, IGDBGameRaw } from '@/lib/igdb';
import { booksGet } from '@/lib/books';
import { mapGamesIGDB } from '@/lib/map';
import { tmdbPosterUrl } from '@/lib/images';
import { EnrichedMediaDetail } from '@/lib/detailTypes';
import { zEnrichedDetail } from '@/lib/schemas/details';

export const revalidate = 86400; // 24h for stable core details

// --- Helpers ---
async function howLongToBeatSearch(): Promise<{ mainStory?: number; mainExtra?: number; completionist?: number }> {
  // Placeholder stub. Real implementation would call an internal proxy endpoint.
  try {
    // Return undefined times for now; extend later.
    return {};
  } catch { return {}; }
}

function readingMinutesFromPageCount(pages?: number | null): number | null {
  if (!pages) return null; // assume 250 wpm, ~300 words/page => 75k words for 300 pages => 300 mins
  const words = pages * 300; // rough
  return Math.round(words / 250); // minutes
}

// --- Route ---
export async function GET(_req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!type || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  try {
    if (type === 'movie' || type === 'tv') {
  interface TmdbDetail { id: number; title?: string; name?: string; overview?: string; poster_path?: string | null; backdrop_path?: string | null; genres?: { name?: string }[]; runtime?: number | null; episode_run_time?: number[]; number_of_episodes?: number; tagline?: string; status?: string; budget?: number; revenue?: number; original_language?: string; release_date?: string; first_air_date?: string; adult?: boolean; content_ratings?: { results?: { iso_3166_1?: string; rating?: string }[] }; certifications?: unknown; } // simplified
      const raw = await tmdbJson<TmdbDetail>(`/${type}/${id}`);
      const title = raw.title ?? raw.name ?? 'Untitled';
      const dateStr = raw.release_date || raw.first_air_date || null;
      const year = dateStr ? new Date(dateStr).getFullYear() : null;
      const runtime = raw.runtime ?? (raw.episode_run_time && raw.episode_run_time[0]) ?? null;
      const totalEpisodes = raw.number_of_episodes ?? null;
      const detail: EnrichedMediaDetail = {
        id: raw.id,
        type: type as 'movie' | 'tv',
        title,
        year,
  posterUrl: tmdbPosterUrl(raw.poster_path, 'w500'),
        sublabel: `${type.toUpperCase()}${year ? ` • ${year}` : ''}`,
        overview: raw.overview ?? null,
        genres: (raw.genres || []).map(g => g.name).filter(Boolean) as string[],
        rating: [],
        tagline: raw.tagline || null,
        runtimeMinutes: runtime,
        totalEpisodes,
        totalWatchMinutes: totalEpisodes && runtime ? totalEpisodes * runtime : null,
        budget: raw.budget || null,
        revenue: raw.revenue || null,
        status: raw.status || null,
        originalLanguage: raw.original_language || null,
        recommendations: [],
        crossRecommendations: [],
      };
      // recommendations
      try {
        const rec = await tmdbJson<{ results?: { id: number; title?: string; name?: string; poster_path?: string | null; release_date?: string; first_air_date?: string }[] }>(`/${type}/${id}/recommendations`);
        detail.recommendations = (rec.results || []).slice(0, 20).map(r => {
          const d = r.release_date || r.first_air_date || null;
          const y = d ? new Date(d).getFullYear() : null;
          return { id: r.id, type: (r.title ? 'movie' : 'tv') as 'movie' | 'tv', title: r.title || r.name || 'Untitled', year: y, poster_path: r.poster_path || null, posterUrl: tmdbPosterUrl(r.poster_path, 'w300'), sublabel: `${r.title ? 'MOVIE' : 'TV'}${y ? ` • ${y}` : ''}` };
        });
      } catch {}
  const parsed = zEnrichedDetail.parse(detail);
  return NextResponse.json({ item: parsed });
    }

    if (type === 'game') {
      const body = `fields name,cover.image_id,first_release_date,genres.name,summary,similar_games,platforms.name; where id = ${id};`;
      const rows = await igdb<IGDBGameRaw>('games', body);
      const g = rows[0];
      if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const year = g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null;
  const times = await howLongToBeatSearch();
      const detail: EnrichedMediaDetail = {
        id: g.id,
        type: 'game',
        title: g.name || 'Untitled',
        year,
  posterUrl: igdbCoverUrl(g.cover?.image_id),
        sublabel: `GAME${year ? ` • ${year}` : ''}`,
        overview: g.summary || null,
        genres: (g.genres || []).map(x => x?.name).filter(Boolean) as string[],
        platforms: (g.platforms || []).map(p => p?.name).filter(Boolean) as string[],
        howLongToBeat: times,
        recommendations: [],
        crossRecommendations: [],
        rating: [],
      };
      if (Array.isArray(g.similar_games) && g.similar_games.length) {
        try {
          const simBody = `fields name,cover.image_id,first_release_date; where id = (${g.similar_games.slice(0,20).join(',')});`;
          const sim = await igdb<IGDBGameRaw>('games', simBody);
          detail.recommendations = mapGamesIGDB(sim).map(r => ({ ...r, year: r.year ?? null }));
        } catch {}
      }
  const parsed = zEnrichedDetail.parse(detail);
  return NextResponse.json({ item: parsed });
    }

    if (type === 'book') {
      const vol = await booksGet(String(id));
      if (!vol) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const vi = vol.volumeInfo || {};
      const yearStr = vi.publishedDate?.slice(0,4) || null;
      const year = yearStr && /\d{4}/.test(yearStr) ? Number(yearStr) : null;
      const img = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || null;
  const viRecord = vi as Record<string, unknown>;
  const pageCount = typeof viRecord.pageCount === 'number' ? viRecord.pageCount : undefined;
      const detail: EnrichedMediaDetail = {
        id: vol.id,
        type: 'book',
        title: vi.title || 'Untitled',
        year,
  posterUrl: img || null,
        sublabel: `BOOK${year ? ` • ${year}` : ''}`,
        overview: vi.description || null,
        genres: vi.categories || [],
        pageCount: pageCount ?? null,
        readingMinutes: readingMinutesFromPageCount(pageCount ?? null),
        authors: vi.authors || [],
        publisher: vi.publisher || null,
        publishedDate: vi.publishedDate || null,
        isbn: Array.isArray((viRecord.industryIdentifiers as unknown[] | undefined))
          ? (viRecord.industryIdentifiers as Array<{ identifier?: string }>)[0]?.identifier ?? null
          : null,
        recommendations: [],
        crossRecommendations: [],
        rating: [],
      };
  const parsed = zEnrichedDetail.parse(detail);
  return NextResponse.json({ item: parsed });
    }

    return NextResponse.json({ error: 'Unsupported type' }, { status: 400 });
  } catch (e) {
  const msg = e instanceof Error ? e.message : 'failed';
  return NextResponse.json({ error: msg }, { status: 500 });
  }
}
