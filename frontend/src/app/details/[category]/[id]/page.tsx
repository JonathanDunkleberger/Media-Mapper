export const dynamic = 'force-dynamic';

import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { keys } from '@/lib/query-keys';
import type { MediaItem } from '@/lib/types';
import { getRequestBaseUrl } from '@/lib/http/base-url';
import { mustOk } from '@/lib/http/mustOk';
import DetailsClient from './DetailsClient';

// Minimal detail shape (extend if you have MediaDetails type elsewhere)
export interface MediaDetails {
  id: number; title: string; type: string; posterUrl?: string | null; overview?: string | null;
  year?: number | null; recommendations?: MediaItem[];
}

interface DetailParams { category: string; id: string }

export default async function Page({ params }: { params: Promise<DetailParams> }) {
  const resolved = await params;
  const base = await getRequestBaseUrl();
  const cat = resolved.category;
  const id = Number(resolved.id);

  const qc = new QueryClient();

  await qc.prefetchQuery({
    queryKey: keys.details(cat, id),
    queryFn: async () => mustOk<MediaDetails>(await fetch(`${base}/api/details/${cat}/${id}`, { cache: 'no-store' })),
  });

  await qc.prefetchQuery({
    queryKey: keys.recommend(cat, id),
    queryFn: async () => mustOk<MediaItem[]>(await fetch(`${base}/api/recommend/${cat}/${id}?page=1&take=20`, { cache: 'no-store' })),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DetailsClient category={cat} id={id} />
    </HydrationBoundary>
  );
}
