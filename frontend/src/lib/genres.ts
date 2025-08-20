// server-only removed for test compatibility
import { tmdb as tmdbJson } from './tmdb.server';
import { cache } from 'react';

interface TMDBGenre { id: number; name: string }

export const getTmdbMovieGenres = cache(async () => {
  const j = await tmdbJson<{ genres: TMDBGenre[] }>('/genre/movie/list');
  return j.genres.map(g => ({ id: String(g.id), label: g.name }));
});
export const getTmdbTvGenres = cache(async () => {
  const j = await tmdbJson<{ genres: TMDBGenre[] }>('/genre/tv/list');
  return j.genres.map(g => ({ id: String(g.id), label: g.name }));
});
export const getAnimeGenres = getTmdbTvGenres; // reuse tv list for anime

export const getIgdbGenres = cache(async () => {
  return [
    { id: '5', label: 'Shooter' },
    { id: '12', label: 'Role-playing' },
    { id: '14', label: 'Sport' },
    { id: '10', label: 'Racing' },
    { id: '31', label: 'Adventure' },
    { id: '32', label: 'Indie' },
    { id: '2', label: 'Point-and-click' },
    { id: '8', label: 'Platform' },
    { id: '15', label: 'Strategy' },
  ];
});

export const getBookSubjects = cache(async () => {
  return [
    { id: 'fiction', label: 'Fiction' },
    { id: 'fantasy', label: 'Fantasy' },
    { id: 'science%20fiction', label: 'Sci-Fi' },
    { id: 'mystery', label: 'Mystery' },
    { id: 'nonfiction', label: 'Non-fiction' },
    { id: 'romance', label: 'Romance' },
    { id: 'history', label: 'History' },
  ];
});
