'use client';
import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/useSession';

export function FavoritesSyncOnSignIn() {
  const token = useSession();
  const synced = useRef(false);
  // Legacy component retained for layout; syncing now implicit via mutations.
  useEffect(() => { if (token) synced.current = true; }, [token]);
  return null;
}
