// types/media.ts


export interface MediaItem {
  id: number | string;
  title?: string;
  name?: string;
  poster_path?: string;
  cover?: {
    image_id: string;
  };
  imageLinks?: {
    thumbnail: string;
  };
  media_type: 'movie' | 'tv' | 'book' | 'game';
}

export interface Movie extends MediaItem {
  media_type: 'movie';
  // Movie-specific properties
}

export interface Game extends MediaItem {
  media_type: 'game';
  // Game-specific properties
}

export interface Book extends MediaItem {
  media_type: 'book';
  // Book-specific properties
}

export type MediaType = Movie | Game | Book;

export type NormalizedMedia = {
  type: 'movie' | 'tv' | 'book' | 'game';
  id: string | number;
  title: string;
  media_type: 'movie' | 'tv' | 'book' | 'game';
  imageUrl?: string;
  image?: { url: string; aspectRatio?: number } | null;
  cover_image_url?: string;
  poster_path?: string;
  background_image?: string;
  __raw?: unknown;
};

export type KnownMedia = MediaItem | NormalizedMedia;

// Type guards for the strict MediaItem variants (operate on KnownMedia)
export function isMovie(item: KnownMedia): item is Movie {
  return (item as Movie).media_type === 'movie';
}
export function isBook(item: KnownMedia): item is Book {
  return (item as Book).media_type === 'book';
}
export function isGame(item: KnownMedia): item is Game {
  return (item as Game).media_type === 'game';
}
