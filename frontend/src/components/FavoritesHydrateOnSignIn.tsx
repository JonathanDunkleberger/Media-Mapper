'use client';
import { useEffect } from 'react';
import { useSession } from '@/lib/useSession';
import { useFavorites } from '@/store/favorites';
import { fetchInternalAPI } from '@/lib/api';
import type { MediaType, MediaItem } from '@/lib/types';

export default function FavoritesHydrateOnSignIn() {
  const token = useSession();
  const mergeAll = useFavorites(s => s.mergeAll);

  useEffect(() => {
    if (!token) return;
    fetchInternalAPI<{ items?: { id: string | number; type: string; title?: string; posterUrl?: string | null; year?: number | null; sublabel?: string | null }[] }>(`/api/favorites`, { cache: 'no-store' })
      .then(json => {
        if (!json?.items) return;
        const minimal = json.items.map(i => ({
          id: i.id,
          type: i.type as MediaType, // trusted backend values
          title: i.title ?? '',
          posterUrl: i.posterUrl ?? null,
          year: i.year ?? null,
          sublabel: i.sublabel ?? null
        })) as MediaItem[];
        mergeAll(minimal);
      });
  }, [token, mergeAll]);

  return null;
}
