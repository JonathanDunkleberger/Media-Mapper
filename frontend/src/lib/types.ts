// Central media type definitions
export type MediaType = 'movie' | 'tv' | 'game' | 'book';

export type MediaItem = {
  id: string | number;
  type: MediaType;
  title: string;
  year?: number | null;
  posterUrl: string | null;
  sublabel?: string | null;
};

export type MediaDetail = MediaItem & {
  overview?: string | null;
  studios?: string[];
  genres?: string[];
  rating?: { source: 'tmdb' | 'mal' | 'imdb' | 'metacritic'; score: number }[];
  seasons?: { name: string; year?: number; studio?: string }[];
  links?: { label: string; url: string }[];
  similar?: MediaItem[];
};
