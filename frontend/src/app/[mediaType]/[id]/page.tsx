'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { EnrichedMediaDetail } from '@/lib/detailTypes';
import Image from 'next/image';

export default function MediaDetailPage() {
  const { mediaType, id } = useParams() as { mediaType: string; id: string };
  const [item, setItem] = useState<EnrichedMediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    fetch(`/api/details/${mediaType}/${id}`, { signal: controller.signal })
      .then(r => r.json())
      .then(json => {
        if (json?.item) setItem(json.item as EnrichedMediaDetail); else setError(json.error || 'Not found');
      })
      .catch(e => { if (e.name !== 'AbortError') setError('Failed to load details'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [mediaType, id]);

  const metaLine = useMemo(() => {
    if (!item) return '';
    const bits: string[] = [];
    if (item.year) bits.push(String(item.year));
    if (item.runtimeMinutes) bits.push(`${item.runtimeMinutes}m`);
    if (item.pageCount) bits.push(`${item.pageCount}p`);
    if (item.readingMinutes) bits.push(`~${item.readingMinutes}m read`);
    if (item.howLongToBeat?.mainStory) bits.push(`${item.howLongToBeat.mainStory}m main`);
    return bits.join(' • ');
  }, [item]);

  if (loading) return <div className="text-center py-20 text-xl">Loading…</div>;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!item) return null;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="max-w-6xl mx-auto px-4 pt-10 flex gap-6">
        {item.posterUrl && (
          <Image src={item.posterUrl} alt="Poster" width={192} height={288} className="w-48 h-auto rounded shadow object-cover" />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-semibold mb-2">{item.title}</h1>
          {metaLine && <p className="text-sm text-neutral-400 mb-2">{metaLine}</p>}
          {item.tagline && <p className="italic text-neutral-300 mb-4">{item.tagline}</p>}
          {item.genres && item.genres.length > 0 && (
            <p className="text-xs uppercase tracking-wide text-neutral-400 mb-4">{item.genres.join(' • ')}</p>
          )}
          {item.overview && <p className="text-sm leading-relaxed max-w-prose">{item.overview}</p>}
        </div>
      </header>
      <section className="max-w-6xl mx-auto px-4 py-10 grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          {item.recommendations?.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Recommendations</h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {item.recommendations.map(r => (
                  <li key={`${r.type}-${r.id}`} className="text-xs">
                    {r.posterUrl && (
                      <Image src={r.posterUrl} alt={r.title} width={120} height={180} className="rounded mb-1 object-cover w-full h-auto" />
                    )}
                    <div className="line-clamp-2 leading-tight">{r.title}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <aside className="space-y-6">
          {item.platforms && item.platforms.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Platforms</h3>
              <ul className="text-sm space-y-1">{item.platforms.map(p => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          {item.authors && item.authors.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Authors</h3>
              <ul className="text-sm space-y-1">{item.authors.map(a => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
          {item.publisher && (
            <div>
              <h3 className="font-semibold mb-1">Publisher</h3>
              <p className="text-sm">{item.publisher}</p>
            </div>
          )}
          {item.howLongToBeat && (item.howLongToBeat.mainStory || item.howLongToBeat.mainExtra || item.howLongToBeat.completionist) && (
            <div>
              <h3 className="font-semibold mb-2">Play Time</h3>
              <ul className="text-sm space-y-1">
                {item.howLongToBeat.mainStory && <li>Main: {item.howLongToBeat.mainStory}m</li>}
                {item.howLongToBeat.mainExtra && <li>Main + Extra: {item.howLongToBeat.mainExtra}m</li>}
                {item.howLongToBeat.completionist && <li>Completionist: {item.howLongToBeat.completionist}m</li>}
              </ul>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
