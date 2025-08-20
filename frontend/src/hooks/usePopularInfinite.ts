'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { qGet } from '@/lib/api/query';
import { keys } from '@/lib/query-keys';
import type { MediaItem } from '@/lib/types';

const TAKE = 60;

export function usePopularInfinite(cat: string, mode: string) {
  return useInfiniteQuery<MediaItem[], Error>({
    queryKey: keys.popular(cat, mode),
  queryFn: ({ pageParam = 1 }) => qGet<MediaItem[]>(`popular/${cat}`, { mode, page: pageParam, take: TAKE }),
    getNextPageParam: (last, all) => (last.length === TAKE ? all.length + 1 : undefined),
    staleTime: 60_000,
  initialPageParam: 1,
  });
}
