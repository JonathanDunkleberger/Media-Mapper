export const tmdbBase = 'https://image.tmdb.org/t/p';

export function safePosterUrl(path?: string | null, size: 'w185' | 'w300' | 'w500' = 'w300'): string | null {
  if (!path) return null;
  return `${tmdbBase}/${size}${path}`;
}
