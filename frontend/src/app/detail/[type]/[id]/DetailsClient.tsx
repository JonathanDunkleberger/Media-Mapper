"use client";
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { keys } from '@/lib/query-keys';
import { apiUrl, canonicalCategory } from '@/lib/api-base';
import type { MediaDetails } from './page';

export default function DetailsClient({ category, id }: { category: string; id: number }) {
  const detail = useQuery<MediaDetails>({
    queryKey: keys.details(category, id),
    queryFn: async () => {
  const r = await fetch(apiUrl(`details/${canonicalCategory(category)}/${id}`));
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || 'Failed');
      return j.data as MediaDetails;
    }
  });

  if (detail.isLoading) return <div className="py-20 text-center">Loading…</div>;
  if (detail.isError) return <div className="py-20 text-center text-red-500">Failed to load.</div>;
  const item = detail.data!;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="max-w-6xl mx-auto px-4 pt-10 flex gap-6">
        {item.posterUrl && <Image src={item.posterUrl} alt={item.title} width={192} height={288} className="w-48 h-auto rounded shadow object-cover" />}
        <div className="flex-1">
          <h1 className="text-3xl font-semibold mb-2">{item.title}</h1>
          {item.overview && <p className="text-sm leading-relaxed max-w-prose">{item.overview}</p>}
        </div>
      </header>
      <section className="max-w-6xl mx-auto px-4 py-10">
    {item.recommendations && item.recommendations.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3">Recommendations</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {item.recommendations.map(r => (
                <li key={`${r.type}:${r.id}`} className="text-xs">
                  {r.posterUrl && <Image src={r.posterUrl} alt={r.title} width={120} height={180} className="rounded mb-1 object-cover w-full h-auto" />}
                  <div className="line-clamp-2 leading-tight">{r.title}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
