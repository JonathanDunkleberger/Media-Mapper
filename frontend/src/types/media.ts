// types/media.ts

// Core typed media shapes
export type Movie = {
  type: 'movie';
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  poster_path?: string;
};

export type TV = {
  type: 'tv';
  id: number;
  name: string;
  overview: string;
  backdrop_path: string;
  poster_path?: string;
};

export type Book = {
  type: 'book';
  key: string;
  title: string;
  author: string;
  imageLinks?: { thumbnail?: string };
};

export type Game = {
  type: 'game';
  id: number;
  name: string;
  background_image: string;
};

export type MediaItem = Movie | TV | Book | Game;

// A looser shape representing search results returned by Algolia / external APIs
export type SearchResult = {
  objectID?: string;
  external_id?: string | number;
  id?: number;
  key?: string;
  title?: string;
  name?: string;
  media_type?: 'movie' | 'tv' | 'book' | 'game';
  type?: 'movie' | 'tv' | 'book' | 'game';
  category?: string;
  cover_image_url?: string;
  poster_path?: string;
  cover?: { url?: string } | null;
  imageLinks?: { thumbnail?: string } | null;
  background_image?: string;
  // allow extra unknown props (avoid using `any` so lint rules stay happy)
  [key: string]: unknown;
};

// KnownMedia is the union consumers should accept: either a strict MediaItem or a SearchResult
export type KnownMedia = MediaItem | SearchResult;

// Type guards for the strict MediaItem variants (operate on KnownMedia)
export function isMovie(item: KnownMedia): item is Movie {
  return (item as Movie).type === 'movie';
}
export function isTV(item: KnownMedia): item is TV {
  return (item as TV).type === 'tv';
}
export function isBook(item: KnownMedia): item is Book {
  return (item as Book).type === 'book';
}
export function isGame(item: KnownMedia): item is Game {
  return (item as Game).type === 'game';
}
