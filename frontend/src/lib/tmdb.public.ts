export const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';
export const posterUrl = (p?: string, size: 'w185'|'w342'|'w500'|'original'='w342') => p ? `${TMDB_IMG_BASE}/${size}${p}` : '';
export const backdropUrl = (p?: string, size: 'w780'|'w1280'|'original'='w780') => p ? `${TMDB_IMG_BASE}/${size}${p}` : '';
