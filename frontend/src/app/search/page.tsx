export const dynamic = 'force-dynamic';

import SearchClient from './ui/SearchClient';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { keys } from '@/lib/query-keys';
import type { MediaItem } from '@/lib/types';
import { getRequestBaseUrl } from '@/lib/http/base-url';
import { mustOk } from '@/lib/http/mustOk';

interface SearchParams { [key: string]: string | string[] | undefined }

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolved = await searchParams;
  const base = await getRequestBaseUrl();
  const qRaw = Array.isArray(resolved.q) ? resolved.q[0] : resolved.q;
  const q = (qRaw ?? '').trim();
  const catRaw = Array.isArray(resolved.cat) ? resolved.cat[0] : resolved.cat;
  const cat = catRaw; // optional category filter
  const mode = cat ? cat : undefined;
  const qc = new QueryClient();

  if (q) {
    const url = new URL(`${base}/api/search`);
    url.searchParams.set('q', q);
    if (mode) url.searchParams.set('cat', mode);
    url.searchParams.set('page', '1');
    url.searchParams.set('take', '20');
    await qc.prefetchQuery({
      queryKey: keys.search(q, mode),
      queryFn: async () => mustOk<MediaItem[]>(await fetch(url.toString(), { cache: 'no-store' })),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <main className="px-6 pb-24">
        <SearchClient />
      </main>
    </HydrationBoundary>
  );
}
