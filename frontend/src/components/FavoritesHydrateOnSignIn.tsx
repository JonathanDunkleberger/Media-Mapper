'use client';
import { useEffect } from 'react';
import { useSession } from '@/lib/useSession';
import { useFavorites } from '@/store/favorites';

export default function FavoritesHydrateOnSignIn() {
  const token = useSession();
  const mergeAll = useFavorites(s => s.mergeAll);

  useEffect(() => {
    if (!token) return;
    fetch('/api/favorites', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.items) mergeAll(json.items); });
  }, [token, mergeAll]);

  return null;
}
