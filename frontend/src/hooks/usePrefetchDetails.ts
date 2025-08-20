'use client';
import { useQueryClient } from '@tanstack/react-query';
import { keys } from '@/lib/query-keys';
import { qGet } from '@/lib/api/query';
import type { EnrichedMediaDetail } from '@/lib/detailTypes';

export function usePrefetchDetails(cat: string) {
  const qc = useQueryClient();
  return (id: number | string) => {
    void qc.prefetchQuery({
      queryKey: keys.details(cat, Number(id)),
  queryFn: () => qGet<EnrichedMediaDetail>(`details/${cat}/${id}`),
      staleTime: 5 * 60_000,
    });
  };
}
