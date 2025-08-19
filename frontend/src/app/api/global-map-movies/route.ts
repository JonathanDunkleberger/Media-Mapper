import { NextResponse } from 'next/server';

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

async function fetchTopMoviesByCountry(countryCode: string, apiKey: string): Promise<MovieResult[]> {
  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&region=${countryCode}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results || []).slice(0, 3).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null,
      country: countryCode,
      coords: COUNTRY_COORDS[countryCode] || null
    }));
  } catch {
    return [];
  }
}

async function fetchGlobalTopMovies(): Promise<MovieResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY not set');
  const all = await Promise.all(COUNTRY_CODES.map(code => fetchTopMoviesByCountry(code, apiKey)));
  return all.flat();
}

export async function GET() {
  try {
    const movies = await fetchGlobalTopMovies();
    return NextResponse.json({ movies });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch global map movies' }, { status: 500 });
  }
}
