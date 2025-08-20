"use client";
import { useFavoritesStore } from '@/store/favorites-zustand';
import Link from 'next/link';
import { SafeImage } from '@/components/SafeImage';
import { XMarkIcon } from '@heroicons/react/24/outline';
import GetRecommendationsButton from '@/components/GetRecommendationsButton';

export default function FavoritesPanel() {
  const { favorites, removeFavorite, getFavoritesCount } = useFavoritesStore();
  const count = getFavoritesCount();

  if (count === 0) {
    return (
      <div className="hidden lg:block fixed right-6 top-24 w-80 bg-zinc-900/90 backdrop-blur border border-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Your Favorites</h3>
        <div className="text-center text-zinc-400 py-8">
          <p className="mb-2">No favorites yet</p>
          <p className="text-sm">Use the search bar to add your favorite media</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:block fixed right-6 top-24 w-80 bg-zinc-900/90 backdrop-blur border border-white/10 rounded-lg p-4 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Your Favorites ({count})</h3>
      </div>
      
      {/* Get Recommendations Button */}
      <div className="mb-4">
        <GetRecommendationsButton />
      </div>
      
      <div className="space-y-2">
        {favorites.slice(0, 10).map((item) => (
          <div key={`${item.type}:${item.id}`} className="flex items-center gap-3 p-2 rounded hover:bg-white/5">
            <div className="w-12 h-16 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
              {item.posterUrl && (
                <SafeImage 
                  src={item.posterUrl} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                  w={48}
                  h={64}
                />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <Link 
                href={`/detail/${item.type}/${item.id}`}
                className="block hover:text-indigo-400"
              >
                <div className="font-medium text-sm truncate">{item.title}</div>
                <div className="text-xs text-zinc-400 truncate">{item.sublabel}</div>
              </Link>
            </div>
            
            <button
              onClick={() => removeFavorite(item.id, item.type)}
              className="p-1 hover:bg-red-600/20 rounded text-red-400 hover:text-red-300"
              title="Remove from favorites"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {count > 10 && (
          <div className="text-center pt-2 text-sm text-zinc-400">
            +{count - 10} more favorites
          </div>
        )}
      </div>
    </div>
  );
}