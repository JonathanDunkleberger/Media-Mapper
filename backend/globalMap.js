const fetch = require('node-fetch');

const COUNTRY_CODES = [
  'US', 'JP', 'BR', 'DE', 'RU', 'CN', 'IN', 'GB', 'FR', 'IT', 'KR', 'CA', 'AU', 'ES', 'MX'
];

const COUNTRY_COORDS = {
  US: { lat: 38.0, lng: -97.0 }, JP: { lat: 36.2, lng: 138.2 }, BR: { lat: -14.2, lng: -51.9 },
  DE: { lat: 51.2, lng: 10.4 }, RU: { lat: 61.5, lng: 105.3 }, CN: { lat: 35.9, lng: 104.2 },
  IN: { lat: 21.1, lng: 78.0 }, GB: { lat: 55.3, lng: -3.4 }, FR: { lat: 46.6, lng: 2.2 },
  IT: { lat: 41.9, lng: 12.6 }, KR: { lat: 36.5, lng: 127.8 }, CA: { lat: 56.1, lng: -106.3 },
  AU: { lat: -25.3, lng: 133.8 }, ES: { lat: 40.5, lng: -3.7 }, MX: { lat: 23.6, lng: -102.5 }
};

async function fetchTopMoviesByCountry(countryCode, apiKey) {
  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&region=${countryCode}`;
  try {
    console.log(`[fetchTopMoviesByCountry] Fetching for ${countryCode} with apiKey present:`, !!apiKey);
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[fetchTopMoviesByCountry] TMDB response not ok for ${countryCode}:`, res.status, res.statusText);
      return [];
    }
    const json = await res.json();
    return (json.results || []).slice(0, 3).map(movie => ({
      id: movie.id,
      title: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null,
      country: countryCode,
      coords: COUNTRY_COORDS[countryCode] || null
    }));
  } catch (error) {
    console.error(`[fetchTopMoviesByCountry] Failed for ${countryCode}:`, error);
    return [];
  }
}

async function fetchGlobalTopMovies() {
  const apiKey = process.env.TMDB_API_KEY;
  console.log('[fetchGlobalTopMovies] Called with TMDB_API_KEY present:', !!apiKey);
  if (!apiKey) throw new Error('TMDB_API_KEY not set');
  try {
    const all = await Promise.all(
      COUNTRY_CODES.map(code => fetchTopMoviesByCountry(code, apiKey))
    );
    return all.flat();
  } catch (error) {
    console.error('[fetchGlobalTopMovies] Error:', error);
    return [];
  }
}

module.exports = { fetchGlobalTopMovies };
