import { create } from 'zustand';
import type { MediaItem } from '@/lib/types';
import { fetchInternalAPI } from '@/lib/api';

interface FavoritesState {
  items: MediaItem[];
  add: (item: MediaItem) => void;
  remove: (type: string, id: string | number) => void;
  toggle: (item: MediaItem) => void;
  hydrate: () => void;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  setAll: (items: MediaItem[]) => void;
  mergeAll: (items: Array<Pick<MediaItem, 'id' | 'type'> & Partial<MediaItem>>) => void;
}

const STORAGE_KEY = 'favorites-v1';
function keyOf(i: { id: string | number; type: string }) { return `${i.type}:${i.id}`; }
function dedupe(arr: MediaItem[]) {
  const m = new Map(arr.map(i => [keyOf(i), i] as const));
  return [...m.values()];
}

export const useFavorites = create<FavoritesState>((set, get) => ({
  items: [],
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MediaItem[];
        set({ items: parsed });
      }
    } catch {}
  },
  add: (item) => set(state => {
    if (state.items.some(i => i.type === item.type && i.id === item.id)) return state;
    const next = [...state.items, item];
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { items: next };
  }),
  remove: (type, id) => set(state => {
    const next = state.items.filter(i => !(i.type === type && i.id === id));
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { items: next };
  }),
  toggle: (item) => {
    const exists = get().items.some(i => i.type === item.type && i.id === item.id);
    if (exists) get().remove(item.type, item.id);
    else get().add(item);
  },
  syncToServer: async () => {
    const { items } = get();
    await Promise.all(items.map(it => fetchInternalAPI(`/api/favorites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'add', item: it })
    })));
  },
  loadFromServer: async () => {
    const data = await fetchInternalAPI<{ items?: MediaItem[] }>(`/api/favorites`, { cache: 'no-store' });
    const serverItems: MediaItem[] = data.items ?? [];
    get().mergeAll(serverItems);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(get().items));
  },
  setAll: (items: MediaItem[]) => set({ items: dedupe(items) }),
  mergeAll: (incoming) => {
    const map = new Map(get().items.map(i => [keyOf(i), i] as const));
    for (const it of incoming) map.set(keyOf(it), it);
    const merged = [...map.values()];
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    set({ items: merged });
  }
}));
