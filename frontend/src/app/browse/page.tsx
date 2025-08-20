export const dynamic = 'force-dynamic';

import BrowseClient from './BrowseClient';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { headers } from 'next/headers';
import { keys } from '@/lib/query-keys';
import type { MediaItem } from '@/types/media';
import { mustOk } from '@/lib/http/mustOk';

interface BrowseSearchParams { [key: string]: string | string[] | undefined }

export default async function Page({ searchParams }: { searchParams: Promise<BrowseSearchParams> }) {
  const resolved = await searchParams;
  const cat = (Array.isArray(resolved.cat) ? resolved.cat[0] : resolved.cat) ?? 'movie';
  const mode = (Array.isArray(resolved.mode) ? resolved.mode[0] : resolved.mode) ?? 'popular';

  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const base = `${proto}://${host}`;

  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: keys.popular(cat, mode),
    queryFn: async () => mustOk<MediaItem[]>(await fetch(`${base}/api/popular/${cat}?mode=${mode}&page=1&take=60`, { cache: 'no-store' })),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <BrowseClient cat={cat} mode={mode} />
    </HydrationBoundary>
  );
}
