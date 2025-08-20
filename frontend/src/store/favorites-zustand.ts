import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MediaItem } from '@/lib/types';

export interface FavoriteItem extends MediaItem {
  addedAt: number;
}

interface FavoritesState {
  // State
  favorites: FavoriteItem[];
  
  // Actions
  addFavorite: (item: MediaItem) => void;
  removeFavorite: (id: string | number, type: string) => void;
  clearFavorites: () => void;
  isFavorite: (id: string | number, type: string) => boolean;
  
  // Computed
  getFavoritesByType: (type: string) => FavoriteItem[];
  getFavoritesCount: () => number;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      
      addFavorite: (item: MediaItem) => {
        const state = get();
        const exists = state.favorites.some(f => f.id.toString() === item.id.toString() && f.type === item.type);
        if (!exists) {
          set({
            favorites: [...state.favorites, { ...item, addedAt: Date.now() }]
          });
        }
      },
      
      removeFavorite: (id: string | number, type: string) => {
        const state = get();
        set({
          favorites: state.favorites.filter(f => !(f.id.toString() === id.toString() && f.type === type))
        });
      },
      
      clearFavorites: () => {
        set({ favorites: [] });
      },
      
      isFavorite: (id: string | number, type: string) => {
        const state = get();
        return state.favorites.some(f => f.id.toString() === id.toString() && f.type === type);
      },
      
      getFavoritesByType: (type: string) => {
        const state = get();
        return state.favorites.filter(f => f.type === type);
      },
      
      getFavoritesCount: () => {
        const state = get();
        return state.favorites.length;
      },
    }),
    {
      name: 'media-mapper-favorites',
      storage: createJSONStorage(() => localStorage),
      // Only persist favorites, not computed values
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);