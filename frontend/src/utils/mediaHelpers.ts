import type { KnownMedia, SearchResult, NormalizedMedia } from '../types/media';

export function getId(item: KnownMedia): string | number | undefined {
  if ('id' in item && item.id !== undefined) return item.id;
  if ('key' in item && item.key !== undefined) return item.key;
  const s = item as SearchResult;
  if (s.external_id !== undefined) return s.external_id;
  const t = ('title' in item && item.title) ? item.title : ('name' in item && item.name) ? item.name : undefined;
  return t ?? undefined;
}

export function getTitle(item: KnownMedia): string {
  const t = ('title' in item && item.title) ? item.title : ('name' in item && item.name) ? item.name : '';
  return String(t);
}

export function getImageUrl(item: KnownMedia): string | undefined {
  const s = item as SearchResult;
  // Normalized path (primary)
  if (
    typeof (s as { image?: { url?: string } }).image === 'object' &&
    typeof (s as { image?: { url?: string } }).image?.url === 'string'
  ) {
    return (s as { image: { url: string } }).image.url;
  }
  if (typeof (s as { imageUrl?: string }).imageUrl === 'string') {
    return (s as { imageUrl: string }).imageUrl;
  }
  if (s.cover_image_url) return String(s.cover_image_url);
  // Poster path support (movies / tv)
  if ('poster_path' in item && item.poster_path) {
    const p = String(item.poster_path);
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith('/')) return `https://image.tmdb.org/t/p/w500${p}`;
    return p;
  }
  // Books (legacy nested volumeInfo kept minimal)
  if (
    typeof (item as { volumeInfo?: { imageLinks?: { thumbnail?: string } } }).volumeInfo === 'object' &&
    typeof (item as { volumeInfo?: { imageLinks?: { thumbnail?: string } } }).volumeInfo?.imageLinks === 'object' &&
    typeof (item as { volumeInfo?: { imageLinks?: { thumbnail?: string } } }).volumeInfo?.imageLinks?.thumbnail === 'string'
  ) {
    return String((item as { volumeInfo: { imageLinks: { thumbnail: string } } }).volumeInfo.imageLinks.thumbnail).replace('http://','https://');
  }
  // Games cover
  if (s.cover && typeof s.cover === 'object' && typeof s.cover.url === 'string') {
    return String(s.cover.url).replace('t_thumb', 't_cover_big');
  }
  // Background image fallback (games)
  if (s.background_image) return String(s.background_image);
  return undefined;
}

export function getMediaType(item: KnownMedia): string | undefined {
  if ('type' in item) return item.type;
  const s = item as SearchResult;
  return s.media_type || s.type;
}

export function getField<T = unknown>(item: KnownMedia, field: string): T | undefined {
  const v = (item as unknown as Record<string, unknown>)[field];
  if (v === undefined) return undefined;
  return v as T;
}

// Normalize any incoming media-like object into a consistent NormalizedMedia shape
export function normalizeMediaData(item: KnownMedia): NormalizedMedia {
  // Short circuit if already normalized
  if (
    typeof (item as { __raw?: unknown; imageUrl?: string }).__raw !== 'undefined' &&
    typeof (item as { imageUrl?: string }).imageUrl !== 'undefined'
  ) {
    return item as unknown as NormalizedMedia;
  }
  const raw = item as Record<string, unknown>;
  // Derive id
  const id = getId(item) ?? raw.objectID ?? raw.external_id ?? Math.random().toString(36).slice(2);
  // Derive type
  const type = (raw.type || raw.media_type || raw.category || '').toString() || inferTypeFromFields(raw);
  // Derive title
  const title = getTitle(item) || raw.slug || String(id);
  // Resolve best image
  let imageUrl = getImageUrl(item);
  // Additional deep fallbacks for books (volumeInfo)
  if (!imageUrl && typeof raw.volumeInfo === 'object' && raw.volumeInfo !== null) {
    const volumeInfo = raw.volumeInfo as { imageLinks?: { thumbnail?: string; smallThumbnail?: string } };
    if (volumeInfo.imageLinks) {
      imageUrl = volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail;
    }
  }
  if (imageUrl && imageUrl.startsWith('http://')) imageUrl = imageUrl.replace('http://','https://');
  // Provide aspect ratio guess: books 2/3, movies/tv/game 2/3 default for now
  const aspectRatio = 2/3;
  const normalized: NormalizedMedia = {
    type,
    id: typeof id === 'string' || typeof id === 'number' ? id : String(id),
    title: String(title),
    imageUrl: imageUrl,
    image: imageUrl ? { url: imageUrl, aspectRatio } : null,
    // compatibility fields
    cover_image_url: imageUrl,
    poster_path: typeof raw.poster_path === 'string' ? raw.poster_path : undefined,
    background_image: typeof raw.background_image === 'string' ? raw.background_image : undefined,
    __raw: raw
  };
  return normalized;
}

function inferTypeFromFields(raw: Record<string, unknown>): string {
  if ('backdrop_path' in raw || 'poster_path' in raw) return 'movie';
  if ('name' in raw && 'first_air_date' in raw) return 'tv';
  if ('background_image' in raw && !('poster_path' in raw)) return 'game';
  if ('key' in raw && 'author' in raw) return 'book';
  if (
    'volumeInfo' in raw &&
    typeof raw.volumeInfo === 'object' &&
    raw.volumeInfo !== null &&
    ('authors' in (raw.volumeInfo as object) || 'publisher' in (raw.volumeInfo as object))
  ) {
    return 'book';
  }
  return 'media';
}
