import { z } from 'zod';
import { zRawMedia, zMediaItem, MediaItem, RawMedia } from '@/lib/schemas/media';

export const zAnimePipelineInput = z.object({
  trending: z.boolean().default(false),
  selectedGenreIds: z.array(z.number()).default([]),
  sort: z.enum(['popularity', 'top_rated']).default('popularity'),
  minVotesTopRated: z.number().default(50),
});
export type AnimePipelineInput = z.infer<typeof zAnimePipelineInput>;

// Normalize raw TMDB media to our shape
export function normalize(raw: RawMedia, fallbackType: 'movie' | 'tv'): MediaItem {
  const mediaType = (raw.media_type as 'movie' | 'tv') ?? fallbackType;
  const title = mediaType === 'movie' ? raw.title ?? raw.name ?? '' : raw.name ?? raw.title ?? '';
  return zMediaItem.parse({
    id: `${mediaType}:${raw.id}`,
    tmdb_id: raw.id,
    mediaType,
    title,
    popularity: raw.popularity ?? 0,
    voteAverage: raw.vote_average ?? 0,
    voteCount: raw.vote_count ?? 0,
    genreIds: raw.genre_ids ?? [],
    posterPath: raw.poster_path ?? null,
  });
}

export function filterByGenres(items: MediaItem[], selected: number[]): MediaItem[] {
  if (!selected?.length) return items;
  const set = new Set(selected);
  return items.filter(it => it.genreIds.some(g => set.has(g)));
}

export function dedupe(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

function cmpTopRated(a: MediaItem, b: MediaItem): number {
  if (b.voteAverage !== a.voteAverage) return b.voteAverage - a.voteAverage;
  if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
  return b.popularity - a.popularity;
}
function cmpPopularity(a: MediaItem, b: MediaItem): number {
  if (b.popularity !== a.popularity) return b.popularity - a.popularity;
  return b.voteAverage - a.voteAverage;
}

export function processAnime(movieRaw: RawMedia[], tvRaw: RawMedia[], opts: AnimePipelineInput): MediaItem[] {
  const input = zAnimePipelineInput.parse(opts);
  const movies = movieRaw.map(r => normalize(zRawMedia.parse(r), 'movie'));
  const tv     = tvRaw.map(r => normalize(zRawMedia.parse(r), 'tv'));
  let combined = dedupe(filterByGenres([...movies, ...tv], input.selectedGenreIds));
  if (input.sort === 'top_rated') {
    combined = combined
      .filter(it => it.voteCount >= input.minVotesTopRated)
      .sort(cmpTopRated);
  } else {
    combined = combined.sort(cmpPopularity);
  }
  return combined;
}
