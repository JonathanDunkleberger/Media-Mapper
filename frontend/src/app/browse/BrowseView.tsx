"use client";
import { useState, useEffect } from 'react';
import { fetchInternalAPI } from '@/lib/api';
import { apiUrl } from '@/lib/api-base';
import type { MediaItem } from '@/lib/types';
import MediaTile from '@/components/MediaTile';
import { useFavoritesStore } from '@/store/favorites-zustand';
import SearchAutosuggest from '@/components/SearchAutosuggest';

type Category = 'all' | 'movie' | 'tv' | 'game' | 'book';
type Genre = 'all' | 'action' | 'comedy' | 'drama' | 'horror' | 'sci-fi';

export default function BrowseView() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>('all');
  const [genre, setGenre] = useState<Genre>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavoritesStore();

  const categories = [
    { value: 'all' as Category, label: 'All Media' },
    { value: 'movie' as Category, label: 'Movies' },
    { value: 'tv' as Category, label: 'TV & Anime' },
    { value: 'game' as Category, label: 'Games' },
    { value: 'book' as Category, label: 'Books' },
  ];

  const genres = [
    { value: 'all' as Genre, label: 'All Genres' },
    { value: 'action' as Genre, label: 'Action' },
    { value: 'comedy' as Genre, label: 'Comedy' },
    { value: 'drama' as Genre, label: 'Drama' },
    { value: 'horror' as Genre, label: 'Horror' },
    { value: 'sci-fi' as Genre, label: 'Sci-Fi' },
  ];

  useEffect(() => {
    loadItems(true);
  }, [category, genre]);

  const loadItems = async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const endpoints = category === 'all' 
        ? ['popular/movies', 'popular/tv', 'popular/games', 'popular/books']
        : [`popular/${category === 'tv' ? 'tv' : category}s`];
      
      const responses = await Promise.all(
        endpoints.map(endpoint => 
          fetchInternalAPI<any>(apiUrl(endpoint), { cache: 'no-store' })
            .catch(() => ({ results: [], items: [] }))
        )
      );

      const allItems: MediaItem[] = responses.flatMap((response, index) => {
        const data = response.results || response.items || response.movies || response.tv || response.games || response.books || [];
        return data.map((item: any) => ({
          id: item.id?.toString() || Math.random().toString(),
          type: category === 'all' 
            ? (endpoints[index].includes('movie') ? 'movie' : 
               endpoints[index].includes('tv') ? 'tv' : 
               endpoints[index].includes('game') ? 'game' : 'book')
            : category,
          title: item.title || item.name || 'Untitled',
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 
                    item.posterUrl || item.cover?.url || item.volumeInfo?.imageLinks?.thumbnail || null,
          year: item.release_date ? new Date(item.release_date).getFullYear() : 
                item.first_air_date ? new Date(item.first_air_date).getFullYear() : 
                item.year || null,
          sublabel: `${(category === 'all' 
            ? (endpoints[index].includes('movie') ? 'MOVIE' : 
               endpoints[index].includes('tv') ? 'TV' : 
               endpoints[index].includes('game') ? 'GAME' : 'BOOK')
            : category.toUpperCase())}${item.year || item.release_date || item.first_air_date ? ` • ${item.year || new Date(item.release_date || item.first_air_date).getFullYear()}` : ''}`,
        }));
      }).slice(0, 60);

      if (reset) {
        setItems(allItems);
        setPage(2);
      } else {
        setItems(prev => [...prev, ...allItems]);
        setPage(prev => prev + 1);
      }
      setHasMore(allItems.length === 60);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = (item: MediaItem) => {
    if (isFavorite(item.id, item.type)) {
      removeFavorite(item.id, item.type);
    } else {
      addFavorite(item);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Sticky Filter Header */}
      <div className="sticky top-16 z-20 bg-zinc-950/90 backdrop-blur border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Browse Search Bar */}
          <div className="mb-4 max-w-2xl">
            <SearchAutosuggest />
          </div>
          
          {/* Filter Pills */}
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === cat.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            
            <div className="w-px bg-white/10 mx-2"></div>
            
            <div className="flex gap-2">
              {genres.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGenre(g.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    genre === g.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pinterest-style Grid */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {loading && items.length === 0 ? (
            <div className="text-center text-zinc-400 py-16">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading amazing media...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
                {items.map((item) => (
                  <div key={`${item.type}:${item.id}`} className="group relative">
                    <MediaTile item={item} />
                    <button
                      onClick={() => handleFavoriteToggle(item)}
                      className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur transition-all ${
                        isFavorite(item.id, item.type)
                          ? 'bg-red-600/90 text-white'
                          : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title={isFavorite(item.id, item.type) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => loadItems()}
                    disabled={loading}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
              
              {/* Favorites Count Indicator */}
              {favorites.length > 0 && (
                <div className="fixed bottom-6 right-6 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg lg:hidden">
                  ❤ {favorites.length}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}