'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qGet, qPost, qDelete } from '@/lib/api/query';
import { keys } from '@/lib/query-keys';

export type Favorite = { id: number; category: string; title: string; poster?: string };
const favKey = (f: Pick<Favorite, 'id' | 'category'>) => `${f.category}:${f.id}`;

export function useFavorites() {
  return useQuery<Favorite[]>({
    queryKey: keys.favorites(),
  queryFn: () => qGet<Favorite[]>('favorites'),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useFavoritesSet() {
  const { data } = useFavorites();
  return new Set((data ?? []).map(favKey));
}

export function useToggleFavorite() {
  const qc = useQueryClient();

  const add = useMutation({
    mutationKey: ['fav','add'],
  mutationFn: (p: Favorite) => qPost<{ id: number }>('favorites', p),
    onMutate: async (p: Favorite) => {
      await qc.cancelQueries({ queryKey: keys.favorites() });
      const prev = qc.getQueryData<Favorite[]>(keys.favorites()) ?? [];
      const exists = prev.some(f => f.id === p.id && f.category === p.category);
      const next = exists ? prev : [...prev, p];
      qc.setQueryData(keys.favorites(), next);
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(keys.favorites(), ctx.prev); },
    onSettled: () => { qc.invalidateQueries({ queryKey: keys.favorites() }); },
  });

  const remove = useMutation({
    mutationKey: ['fav','remove'],
  mutationFn: (id: number) => qDelete<{ id: number }>('favorites', { id }),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: keys.favorites() });
      const prev = qc.getQueryData<Favorite[]>(keys.favorites()) ?? [];
      const next = prev.filter(f => f.id !== id);
      qc.setQueryData(keys.favorites(), next);
      return { prev };
    },
    onError: (_e, _id, ctx) => { if (ctx?.prev) qc.setQueryData(keys.favorites(), ctx.prev); },
    onSettled: () => { qc.invalidateQueries({ queryKey: keys.favorites() }); },
  });

  return { add, remove };
}
