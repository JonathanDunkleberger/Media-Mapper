"use client";
import { useState } from 'react';
import { useFavoritesStore } from '@/store/favorites-zustand';
import { useRouter } from 'next/navigation';

export default function GetRecommendationsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { getFavoritesCount } = useFavoritesStore();
  const router = useRouter();
  const favCount = getFavoritesCount();

  const handleGetRecommendations = async () => {
    if (favCount < 8) return;
    
    setIsLoading(true);
    try {
      // Set a cookie to enable recommendation mode
      document.cookie = 'mm_recommend=1; path=/; max-age=86400'; // 24 hours
      
      // Force refresh the page to load recommendations
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowTrending = () => {
    // Remove recommendation cookie
    document.cookie = 'mm_recommend=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Force refresh to show trending
    router.refresh();
    window.location.reload();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleGetRecommendations}
        disabled={favCount < 8 || isLoading}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          favCount >= 8
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
            : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
        }`}
        title={favCount < 8 ? `Add ${8 - favCount} more favorites to get recommendations` : 'Get personalized recommendations'}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Loading...
          </div>
        ) : (
          `Get Recommendations ${favCount >= 8 ? `(${favCount})` : `(${favCount}/8)`}`
        )}
      </button>
      
      <button
        onClick={handleShowTrending}
        className="px-4 py-2 rounded-lg font-medium bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
        title="Show trending content"
      >
        Show Trending
      </button>
    </div>
  );
}