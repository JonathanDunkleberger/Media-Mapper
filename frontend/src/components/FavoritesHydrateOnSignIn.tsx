'use client';
import { useEffect } from 'react';
import { useSession } from '@/lib/useSession';
import { useFavorites } from '@/hooks/useFavorites';
import { fetchInternalAPI } from '@/lib/api';

export default function FavoritesHydrateOnSignIn() {
  const token = useSession();
  const { refetch } = useFavorites();

  useEffect(() => {
    if (!token) return;
    // Simply refetch favorites on sign-in to ensure server state is loaded.
    refetch();
  }, [token, refetch]);

  return null;
}
