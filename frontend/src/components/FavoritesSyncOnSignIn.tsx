'use client';
import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/useSession';
import { useFavorites } from '@/store/favorites';

export function FavoritesSyncOnSignIn() {
  const token = useSession();
  const synced = useRef(false);
  const syncToServer = useFavorites(s => s.syncToServer);

  useEffect(() => {
    if (token && !synced.current) {
      synced.current = true;
      syncToServer().catch(() => { synced.current = false; });
    }
  }, [token, syncToServer]);
  return null;
}
