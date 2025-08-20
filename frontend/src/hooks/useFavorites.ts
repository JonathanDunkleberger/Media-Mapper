'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qGet, qPost, qDelete } from '@/lib/api/query';
import { keys } from '@/lib/query-keys';

export type Favorite = { id: number; category: string; title: string; poster?: string };

export function useFavoritesQuery() {
  return useQuery<Favorite[]>({
    queryKey: keys.favorites(),
    queryFn: () => qGet<Favorite[]>('/api/favorites'),
    staleTime: 60_000,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: (p: Favorite) => qPost<{ id: number }>('/api/favorites', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.favorites() }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => qDelete<{ id: number }>('/api/favorites', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.favorites() }),
  });
  return { add, remove };
}
