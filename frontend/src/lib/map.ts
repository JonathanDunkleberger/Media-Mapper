import { tmdbPosterUrl } from './images';
import type { MediaItem } from './types';

// Export raw upstream entity shapes so callers can cast unknown[] safely without using `any`.
export type TMDBMovie = { id: number; title?: string; name?: string; poster_path?: string | null; release_date?: string | null };
export type TMDBTV = { id: number; name?: string; poster_path?: string | null; first_air_date?: string | null };
export type RAWGGame = { id?: number; slug?: string; name?: string; released?: string | null; background_image?: string | null };
export type IGDBGame = { id: number; name?: string; first_release_date?: number; cover?: { image_id?: string } };
export type GoogleVolume = { id: string; volumeInfo?: { title?: string; publishedDate?: string; imageLinks?: { thumbnail?: string; smallThumbnail?: string } } };
export type OpenLibraryDoc = { key?: string; cover_edition_key?: string; isbn?: string[]; title?: string; cover_i?: number; first_publish_year?: number };

export function mapMovies(list: TMDBMovie[]): MediaItem[] {
  return list.map(m => {
    const year = m.release_date ? new Date(m.release_date).getFullYear() : null;
    return {
      id: m.id,
      type: 'movie',
      title: m.title ?? m.name ?? 'Untitled',
      year,
  posterUrl: tmdbPosterUrl(m.poster_path, 'w300'),
      sublabel: `MOVIE${year ? ` • ${year}` : ''}`
    };
  });
}

export function mapTV(list: TMDBTV[]): MediaItem[] {
  return list.map(m => {
    const year = m.first_air_date ? new Date(m.first_air_date).getFullYear() : null;
    return {
      id: m.id,
      type: 'tv',
      title: m.name ?? 'Untitled',
      year,
  posterUrl: tmdbPosterUrl(m.poster_path, 'w300'),
      sublabel: `TV${year ? ` • ${year}` : ''}`
    };
  });
}

// RAWG-like games list mapper (background_image absolute URL)
export function mapGames(list: RAWGGame[]): MediaItem[] {
  return (list ?? []).map(g => {
    const year = g?.released ? new Date(g.released).getFullYear() : null;
    return {
      id: g.id ?? g.slug ?? Math.random().toString(36).slice(2),
      type: 'game',
      title: g.name ?? 'Untitled',
      year,
      posterUrl: g.background_image ?? null,
      sublabel: `GAME${year ? ` • ${year}` : ''}`
    };
  });
}

// IGDB games
export function mapGamesIGDB(list: IGDBGame[]): MediaItem[] {
  return (list ?? []).map(g => {
    const year = g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null;
    return {
      id: g.id,
      type: 'game',
      title: g.name ?? 'Untitled',
      year,
      posterUrl: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null,
      sublabel: `GAME${year ? ` • ${year}` : ''}`
    };
  });
}

// Google Books volumes
export function mapBooksGoogle(list: GoogleVolume[]): MediaItem[] {
  return (list ?? []).map(v => {
    const vi = v.volumeInfo || {};
    const yearStr = vi.publishedDate?.slice(0,4) || null;
    const year = yearStr && /\d{4}/.test(yearStr) ? Number(yearStr) : null;
    const img = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || null;
    return {
      id: v.id,
      type: 'book',
      title: vi.title || 'Untitled',
      year,
      posterUrl: img,
      sublabel: `BOOK${year ? ` • ${year}` : ''}`
    };
  });
}

// OpenLibrary style search docs
export function mapBooks(list: OpenLibraryDoc[]): MediaItem[] {
  return (list ?? []).map(b => {
    const cover = b?.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null;
    const year = b?.first_publish_year ?? null;
    return {
      id: b?.key ?? b?.cover_edition_key ?? (b?.isbn && Array.isArray(b.isbn) ? b.isbn[0] : Math.random().toString(36).slice(2)),
      type: 'book',
      title: (b?.title ?? 'Untitled').trim(),
      year,
      posterUrl: cover,
      sublabel: `BOOK${year ? ` • ${year}` : ''}`
    };
  });
}
