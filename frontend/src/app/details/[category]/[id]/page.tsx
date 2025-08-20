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
  const idNum = Number(resolved.id);

  if (!resolved.id || Number.isNaN(idNum) || idNum <= 0) {
    // Return a lightweight error boundary style response; avoid throwing to keep consistent with dynamic route behavior.
    return (
      <main className="min-h-screen flex items-center justify-center text-red-500">
        Invalid ID
      </main>
    );
  }

  const qc = new QueryClient();

  await qc.prefetchQuery({
    queryKey: keys.details(cat, idNum),
    queryFn: async () => mustOk<MediaDetails>(await fetch(`${base}/api/details/${cat}/${idNum}`, { cache: 'no-store' })),
  });

  await qc.prefetchQuery({
    queryKey: keys.recommend(cat, idNum),
    queryFn: async () => mustOk<MediaItem[]>(await fetch(`${base}/api/recommend/${cat}/${idNum}?page=1&take=20`, { cache: 'no-store' })),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DetailsClient category={cat} id={idNum} />
    </HydrationBoundary>
  );
}
