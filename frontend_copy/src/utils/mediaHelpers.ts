import type { KnownMedia, SearchResult } from '../types/media';

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
  // Standardized recommendation shape may provide image: { url, aspectRatio }
  if ((s as any).image && typeof (s as any).image.url === 'string') return (s as any).image.url as string;
  // Prefer explicit normalized cover image if present
  if (s.cover_image_url) return String(s.cover_image_url);
  // Poster path may be a full URL (from normalization) or a TMDB relative path starting with '/'
  if ('poster_path' in item && item.poster_path) {
    const p = String(item.poster_path);
    if (/^https?:\/\//i.test(p)) return p; // already absolute
    if (p.startsWith('/')) return `https://image.tmdb.org/t/p/w500${p}`; // TMDB relative
    return p; // some other relative or CDN path we pass through
  }
  if ('imageLinks' in item && item.imageLinks?.thumbnail) return item.imageLinks.thumbnail;
  if (s.cover?.url) return String(s.cover.url).replace('t_thumb', 't_cover_big');
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
