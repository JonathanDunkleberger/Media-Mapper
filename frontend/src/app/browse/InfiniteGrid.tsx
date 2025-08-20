'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { qPopular, qFavoriteUpsert, qFavoriteDelete } from '@/lib/api/query';
import { keys } from '@/lib/query-keys';
import MediaTile from '@/components/MediaTile';

export type MediaItem = {
  id: number;
  category: string;
  title?: string;
  name?: string;
  posterUrl?: string;
};

export default function InfiniteGrid({ cat, mode }: { cat: string; mode: string }) {
  const take = 60;
  const qc = useQueryClient();
  const sentinel = useRef<HTMLDivElement | null>(null);

  const query = useInfiniteQuery<MediaItem[], Error>({
    queryKey: keys.popular(cat, mode),
    queryFn: ({ pageParam }) => qPopular<MediaItem[]>(cat, mode, (pageParam as number) || 1, take),
    getNextPageParam: (lastPage: MediaItem[], allPages: MediaItem[][]) => (lastPage.length < take ? undefined : allPages.length + 1),
    initialPageParam: 1,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver((entries) => {
      const [e] = entries;
      if (e.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    }, { rootMargin: '600px 0px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [query, query.hasNextPage, query.isFetchingNextPage]);

  const favAdd = useMutation<{ id: number }, Error, { id: number; category: string; title: string; poster?: string }, { prev?: any[] }>({
    mutationFn: (payload) => qFavoriteUpsert(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: keys.favorites() });
      const prev = qc.getQueryData<any[]>(keys.favorites()) || [];
      qc.setQueryData(keys.favorites(), [...prev, payload]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(keys.favorites(), ctx.prev as any[]),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.favorites() }),
  });

  const favRemove = useMutation<{ id: number }, Error, number, { prev?: any[] }>({
    mutationFn: (id) => qFavoriteDelete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.favorites() });
      const prev = qc.getQueryData<any[]>(keys.favorites()) || [];
      qc.setQueryData(keys.favorites(), prev.filter((x: any) => x.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(keys.favorites(), ctx.prev as any[]),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.favorites() }),
  });

  if (query.isLoading) return <div className="p-4 opacity-70">Loading…</div>;
  if (query.isError) return <div className="p-4 text-red-500">Failed to load.</div>;

  const items: MediaItem[] = query.data?.pages.flat() ?? [];

  return (
    <>
      <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {items.map((m: any) => {
          const item: any = { id: m.id, type: m.category, title: m.title || m.name || 'Untitled', posterUrl: m.posterUrl ?? null };
          return (
            <li key={`${m.category}-${m.id}`} className="group relative">
              <MediaTile item={item} />
              <div className="absolute top-2 right-2">
                <button
                  disabled={favAdd.isPending || favRemove.isPending}
                  className="rounded-xl px-2 py-1 text-xs bg-black/60 text-white hover:bg-black/80 disabled:opacity-40"
                  onClick={() => {
                    // naive check if in optimistic list
                    const favs = qc.getQueryData<any[]>(keys.favorites()) || [];
                    const isFav = favs.some(f => f.id === m.id && (f.category === m.category || f.type === m.category));
                    if (isFav) favRemove.mutate(m.id); else favAdd.mutate({ id: m.id, category: m.category, title: m.title ?? m.name ?? 'Unknown', poster: m.posterUrl });
                  }}
                >
                  {(qc.getQueryData<any[]>(keys.favorites()) || []).some(f => f.id === m.id && (f.category === m.category || f.type === m.category)) ? '★' : '☆'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div ref={sentinel} className="h-12" />
      {query.isFetchingNextPage && <div className="p-4 opacity-70">Loading more…</div>}
      {!query.hasNextPage && <div className="p-4 opacity-60">End of list.</div>}
    </>
  );
}
