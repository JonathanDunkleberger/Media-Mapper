import BrowseClient from './BrowseClient';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { keys } from '@/lib/query-keys';
import { qGet } from '@/lib/api/query';
import type { MediaItem } from '@/lib/types';

export default async function Page({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const cat = searchParams.cat ?? 'movie';
  const mode = searchParams.mode ?? 'popular';

  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: keys.popular(cat, mode),
    queryFn: () => qGet<MediaItem[]>(`/api/popular/${cat}`, { mode, page: 1, take: 60 }),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <BrowseClient cat={cat} mode={mode} />
    </HydrationBoundary>
  );
}
