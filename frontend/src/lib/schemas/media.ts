import { z } from 'zod';

// Raw TMDB-like media item
export const zRawMedia = z.object({
  id: z.number(),
  media_type: z.enum(['movie', 'tv']).optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  popularity: z.number().default(0),
  vote_average: z.number().default(0),
  vote_count: z.number().default(0),
  genre_ids: z.array(z.number()).default([]),
  poster_path: z.string().nullable().optional(),
});
export type RawMedia = z.infer<typeof zRawMedia>;

export const zMediaItem = z.object({
  id: z.string(), // composite key mediaType:tmdb_id
  tmdb_id: z.number(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string(),
  popularity: z.number(),
  voteAverage: z.number(),
  voteCount: z.number(),
  genreIds: z.array(z.number()),
  posterPath: z.string().nullable(),
});
export type MediaItem = z.infer<typeof zMediaItem>;

export const zApiResponse = z.object({
  page: z.number().min(1),
  totalPages: z.number().min(1),
  results: z.array(zMediaItem),
});
export type ApiResponse<T = MediaItem> = z.infer<typeof zApiResponse> & { results: T[] };
