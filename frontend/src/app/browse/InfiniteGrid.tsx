'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { qPopular, qFavoriteUpsert, qFavoriteDelete } from '@/lib/api/query';

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
    queryKey: ['popular', cat, mode],
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
  }, [query.hasNextPage, query.isFetchingNextPage]);

  const favAdd = useMutation<{ id: number }, Error, { id: number; category: string; title: string; poster?: string }, { prev?: any[] }>({
    mutationFn: (payload) => qFavoriteUpsert(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const prev = qc.getQueryData<any[]>(['favorites']) || [];
      qc.setQueryData(['favorites'], [...prev, payload]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['favorites'], ctx.prev as any[]),
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const favRemove = useMutation<{ id: number }, Error, number, { prev?: any[] }>({
    mutationFn: (id) => qFavoriteDelete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const prev = qc.getQueryData<any[]>(['favorites']) || [];
      qc.setQueryData(['favorites'], prev.filter((x: any) => x.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['favorites'], ctx.prev as any[]),
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  if (query.isLoading) return <div className="p-4 opacity-70">Loading…</div>;
  if (query.isError) return <div className="p-4 text-red-500">Failed to load.</div>;

  const items: MediaItem[] = query.data?.pages.flat() ?? [];

  return (
    <>
      <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
  {items.map((m: MediaItem) => (
          <li key={`${m.category}-${m.id}`} className="group relative">
            {/* TODO: integrate MediaCard */}
            <div className="aspect-[2/3] w-full bg-zinc-800 rounded" />
            <button
              className="absolute top-2 right-2 rounded-xl px-2 py-1 text-xs bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
              onClick={() => favAdd.mutate({ id: m.id, category: m.category, title: m.title ?? m.name ?? 'Unknown', poster: m.posterUrl })}
            >
              ☆ Fav
            </button>
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="h-12" />
      {query.isFetchingNextPage && <div className="p-4 opacity-70">Loading more…</div>}
      {!query.hasNextPage && <div className="p-4 opacity-60">End of list.</div>}
    </>
  );
}
