// Unified image helper & fallback chain
// Tile priority: TMDB poster -> TMDB backdrop -> IGDB cover (abs) -> Google Books thumb (abs) -> placeholder -> null
// Backdrop/hero: backdrop -> poster -> null

const DEFAULT_PLACEHOLDER = '/placeholder-media.png';
export const TMDB_IMG_BASE = process.env.TMDB_IMG_BASE || 'https://image.tmdb.org/t/p';

export function buildImageUrl(base: string, pathOrUrl?: string | null): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // already absolute
  const b = base.replace(/\/$/, '');
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${b}${p}`;
}

export function pickPosterPath(obj: { poster_path?: string | null; backdrop_path?: string | null }): string | null {
  return obj.poster_path || obj.backdrop_path || null;
}

export function pickBackdropPath(obj: { backdrop_path?: string | null; poster_path?: string | null }): string | null {
  return obj.backdrop_path || obj.poster_path || null;
}

export interface TileSources {
  tmdbPoster?: string | null;
  tmdbBackdrop?: string | null;
  igdbCover?: string | null; // already absolute
  bookThumb?: string | null; // already absolute
  placeholder?: string | null;
}

export function pickBestTileImageUrl(src: TileSources): string | null {
  return (
    src.tmdbPoster ||
    src.tmdbBackdrop ||
    src.igdbCover ||
    src.bookThumb ||
    src.placeholder ||
    null
  );
}

export function tmdbPosterUrl(path?: string | null, size: 'w185'|'w300'|'w500'='w300'): string | null {
  if (!path) return null;
  return buildImageUrl(TMDB_IMG_BASE, `/${size}${path}`);
}
export function tmdbBackdropUrl(path?: string | null, size: 'w780'|'w1280'|'original'='w780'): string | null {
  if (!path) return null;
  return buildImageUrl(TMDB_IMG_BASE, `/${size}${path}`);
}

export function heroOrOgImage(opts: { backdrop_path?: string | null; poster_path?: string | null }): string | null {
  const back = pickBackdropPath(opts);
  if (!back) return null;
  return tmdbBackdropUrl(back, 'w1280') || tmdbPosterUrl(back, 'w500');
}

export function tileImageFromDetail(detail: { type: string; poster_path?: string | null; backdrop_path?: string | null; igdbCoverUrl?: string | null; bookThumbUrl?: string | null }): string | null {
  const posterAbs = detail.poster_path ? tmdbPosterUrl(detail.poster_path, 'w300') : null;
  const backdropAbs = detail.backdrop_path ? tmdbPosterUrl(detail.backdrop_path, 'w300') : null;
  return pickBestTileImageUrl({
    tmdbPoster: posterAbs,
    tmdbBackdrop: backdropAbs,
    igdbCover: detail.igdbCoverUrl || null,
    bookThumb: detail.bookThumbUrl || null,
    placeholder: DEFAULT_PLACEHOLDER
  });
}

export { DEFAULT_PLACEHOLDER };
