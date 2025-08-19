import type { RawMedia } from '@/lib/schemas/media';

export const MOVIES_FIXTURE: RawMedia[] = [
  { id: 1, media_type: 'movie', title: 'Alpha', popularity: 80, vote_average: 7.8, vote_count: 400, genre_ids: [16, 28] },
  { id: 2, media_type: 'movie', title: 'Bravo', popularity: 95, vote_average: 8.5, vote_count: 10,  genre_ids: [12] }, // low votes
  { id: 3, media_type: 'movie', title: 'Charlie', popularity: 60, vote_average: 8.5, vote_count: 200, genre_ids: [16] },
  { id: 4, media_type: 'movie', title: 'DupMovie', popularity: 50, vote_average: 6.0, vote_count: 50, genre_ids: [99] },
];

export const TV_FIXTURE: RawMedia[] = [
  { id: 10, media_type: 'tv', name: 'Delta', popularity: 120, vote_average: 7.9, vote_count: 800, genre_ids: [16, 35] },
  { id: 11, media_type: 'tv', name: 'Echo', popularity: 70,  vote_average: 8.5, vote_count: 200, genre_ids: [12] },
  { id: 4,  media_type: 'movie', title: 'DupMovie', popularity: 51, vote_average: 6.1, vote_count: 51, genre_ids: [99] }, // same id+type dup
  { id: 12, media_type: 'tv', name: 'Foxtrot', popularity: 50, vote_average: 8.5, vote_count: 200, genre_ids: [16] },
];
