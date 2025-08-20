import MediaRowCarousel from '@/components/MediaRowCarousel';
import { mapMovies, mapTV, mapGamesIGDB, mapBooksGoogle, TMDBMovie, TMDBTV, IGDBGame, GoogleVolume } from '@/lib/map';
import type { MediaItem } from '@/lib/types';
import { cookies } from 'next/headers';
import FavoritesSidebar from '@/components/FavoritesSidebar';
import FavoritesDrawer from '@/components/FavoritesDrawer';
import { fetchInternalAPI } from '@/lib/api';
import { apiUrl } from '@/lib/api-base';

async function fetchRow(path: string, revalidate = 3600) {
  try {
    const json = await fetchInternalAPI<Record<string, unknown>>(path, { next: { revalidate } });
    return (json.results ?? json.items ?? json.movies ?? json.tv ?? json.games ?? json.books ?? []) as unknown[];
  } catch {
    return [] as MediaItem[];
  }
}

export default async function Home() {
  const cookieStore = await cookies();
  const recMode = cookieStore.get('mm_recommend')?.value === '1';
  // Use logical paths via apiUrl helper to avoid raw "/api/" literals.
  const [moviesRaw, tvRaw, gamesRaw, booksRaw] = await Promise.all(
    recMode
      ? [
          fetchRow(apiUrl('recommend?cat=movie'), 0),
          fetchRow(apiUrl('recommend?cat=tv'), 0),
          fetchRow(apiUrl('recommend?cat=game'), 0),
          fetchRow(apiUrl('recommend?cat=book'), 0),
        ]
      : [
          fetchRow(apiUrl('popular/movies')),
          fetchRow(apiUrl('popular/tv')),
          fetchRow(apiUrl('popular/games')),
          fetchRow(apiUrl('popular/books')),
        ]
  );

  const movies = mapMovies(moviesRaw as TMDBMovie[]);
  const tv = mapTV(tvRaw as TMDBTV[]);
  const games = mapGamesIGDB(gamesRaw as IGDBGame[]);
  const books = mapBooksGoogle(booksRaw as GoogleVolume[]);

  return (
    <main className="px-6 pb-24">
      <MediaRowCarousel title={recMode ? 'Recommended Movies' : 'Popular Movies'} items={movies} />
      <MediaRowCarousel title={recMode ? 'Recommended TV & Anime' : 'Top TV & Anime'} items={tv} />
      <MediaRowCarousel title={recMode ? 'Recommended Games' : 'Trending Games'} items={games} />
      <MediaRowCarousel title={recMode ? 'Recommended Books' : 'Popular Books'} items={books} />
      <FavoritesSidebar variant="stack" minForRecommend={8} />
      <FavoritesDrawer />
    </main>
  );
}