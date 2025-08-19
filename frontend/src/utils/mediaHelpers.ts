// Centralized image URL helper for all media types



export function getImageUrl(media: KnownMedia): string {
  // NormalizedMedia: prefer imageUrl, cover_image_url, poster_path, background_image
  if ('imageUrl' in media && typeof media.imageUrl === 'string') return media.imageUrl;
  if ('cover_image_url' in media && typeof media.cover_image_url === 'string') return media.cover_image_url;
  if ('poster_path' in media && typeof media.poster_path === 'string') return `https://image.tmdb.org/t/p/w500${media.poster_path}`;
  if ('background_image' in media && typeof media.background_image === 'string') return media.background_image;

  // MediaItem type guards
  if (isMovie(media)) {
    return media.poster_path
      ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
      : '/placeholder-movie.png';
  }
  if (isGame(media)) {
    return media.cover && media.cover.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${media.cover.image_id}.jpg`
      : '/placeholder-game.png';
  }
  if (isBook(media)) {
    return media.imageLinks && media.imageLinks.thumbnail
      ? media.imageLinks.thumbnail
      : '/placeholder-book.png';
  }

  // Fallback for objects with imageLinks (legacy)
  if ('imageLinks' in media && media.imageLinks && typeof media.imageLinks === 'object' && 'thumbnail' in media.imageLinks && typeof media.imageLinks.thumbnail === 'string') return media.imageLinks.thumbnail;

  return '/placeholder-media.png';
}
import type { KnownMedia, NormalizedMedia, MediaType } from '../types/media';
import { isMovie, isBook, isGame } from '../types/media';

export function getId(item: KnownMedia): string | number | undefined {
  if ('id' in item && item.id !== undefined) return item.id;
  if ('key' in item && typeof item.key === 'string' && item.key.length > 0) return item.key;
  const t = ('title' in item && item.title) ? item.title : ('name' in item && item.name) ? item.name : undefined;
  return t ?? undefined;
}

export function getTitle(item: KnownMedia): string {
  const t = ('title' in item && item.title) ? item.title : ('name' in item && item.name) ? item.name : '';
  return String(t);
}


export function getMediaType(item: KnownMedia): string | undefined {
  if ('media_type' in item) return (item as { media_type?: string }).media_type;
  if ('type' in item) return (item as { type?: string }).type;
  return undefined;
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
  let title = getTitle(item);
  if (!title && typeof raw.slug === 'string') {
    title = raw.slug;
  }
  if (!title) {
    title = String(id);
  }
  // Resolve best image
  // Only call getImageUrl if item is a MediaType (has media_type)
  let imageUrl = '';
  if (isMovie(item) || isGame(item) || isBook(item)) {
    imageUrl = getImageUrl(item as MediaType);
  }
  // Additional deep fallbacks for books (volumeInfo)
  if (!imageUrl && typeof raw.volumeInfo === 'object' && raw.volumeInfo !== null) {
    const volumeInfo = raw.volumeInfo as { imageLinks?: { thumbnail?: string; smallThumbnail?: string } };
    if (volumeInfo.imageLinks) {
  imageUrl = volumeInfo.imageLinks.thumbnail ?? volumeInfo.imageLinks.smallThumbnail ?? '';
    }
  }
  if (imageUrl && imageUrl.startsWith('http://')) imageUrl = imageUrl.replace('http://','https://');

  // Ensure we always have an image url, falling back to a placeholder
  const finalImageUrl = imageUrl || `https://placehold.co/400x600/120e24/8b5cf6?text=${encodeURIComponent(title)}`;

  // Provide aspect ratio guess: books 2/3, movies/tv/game 2/3 default for now
  const aspectRatio = 2/3;
  // Only allow valid media_type values
  const allowedTypes = ['movie', 'tv', 'book', 'game'] as const;
  let media_type: 'movie' | 'tv' | 'book' | 'game' = 'movie';
  if (allowedTypes.includes(type as 'movie' | 'tv' | 'book' | 'game')) {
    media_type = type as 'movie' | 'tv' | 'book' | 'game';
  } else if (typeof raw.media_type === 'string' && allowedTypes.includes(raw.media_type as 'movie' | 'tv' | 'book' | 'game')) {
    media_type = raw.media_type as 'movie' | 'tv' | 'book' | 'game';
  } else {
    media_type = 'movie'; // fallback, or pick another default
  }
  const normalized: NormalizedMedia = {
    type: media_type,
    id: typeof id === 'string' || typeof id === 'number' ? id : String(id),
    title: String(title),
    media_type,
    imageUrl: finalImageUrl,
    image: { url: finalImageUrl, aspectRatio },
    // compatibility fields
    cover_image_url: finalImageUrl,
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
