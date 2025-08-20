import { tmdbJson } from '@/lib/tmdb.server';
import { posterUrl as tmdbImage } from '@/lib/tmdb.public';
import { createJsonRoute } from '@/lib/api/route-factory';

// Simple set of country codes and coordinates
const COUNTRY_CODES = [
  'US', 'JP', 'BR', 'DE', 'RU', 'CN', 'IN', 'GB', 'FR', 'IT', 'KR', 'CA', 'AU', 'ES', 'MX'
];

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 38.0, lng: -97.0 }, JP: { lat: 36.2, lng: 138.2 }, BR: { lat: -14.2, lng: -51.9 },
  DE: { lat: 51.2, lng: 10.4 }, RU: { lat: 61.5, lng: 105.3 }, CN: { lat: 35.9, lng: 104.2 },
  IN: { lat: 21.1, lng: 78.0 }, GB: { lat: 55.3, lng: -3.4 }, FR: { lat: 46.6, lng: 2.2 },
  IT: { lat: 41.9, lng: 12.6 }, KR: { lat: 36.5, lng: 127.8 }, CA: { lat: 56.1, lng: -106.3 },
  AU: { lat: -25.3, lng: 133.8 }, ES: { lat: 40.5, lng: -3.7 }, MX: { lat: 23.6, lng: -102.5 }
};

interface MovieResult { id: number; title: string; poster: string | null; country: string; coords: { lat: number; lng: number } | null; }

async function fetchTopMoviesByCountry(countryCode: string): Promise<MovieResult[]> {
  try {
  const data = await tmdbJson<{ results?: unknown[] }>(`/movie/popular`, { region: countryCode });
  const arr: unknown[] = Array.isArray(data.results) ? data.results : [];
    return arr.slice(0, 3).map(raw => {
      const obj = raw as Record<string, unknown>;
      const id = typeof obj.id === 'number' ? obj.id : Math.floor(Math.random() * 1e9);
      const title = typeof obj.title === 'string' ? obj.title : 'Unknown';
      const posterPath = typeof obj.poster_path === 'string' ? obj.poster_path : null;
  const poster = tmdbImage(posterPath || undefined, 'w342') || null;
      return { id, title, poster, country: countryCode, coords: COUNTRY_COORDS[countryCode] || null } as MovieResult;
    });
  } catch {
    return [];
  }
}

async function fetchGlobalTopMovies(): Promise<MovieResult[]> {
  const all = await Promise.all(COUNTRY_CODES.map(code => fetchTopMoviesByCountry(code)));
  return all.flat();
}

export const runtime = 'nodejs';
export const GET = createJsonRoute({
  cacheSeconds: 3600,
  async run() {
    return await fetchGlobalTopMovies();
  }
});
