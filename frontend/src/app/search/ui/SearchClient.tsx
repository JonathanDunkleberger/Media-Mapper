"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MediaTile from '@/components/MediaTile';
import type { MediaItem } from '@/lib/types';
import { fetchInternalAPI } from '@/lib/api';
import { apiUrl } from '@/lib/api-base';

export default function SearchClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const qParam = sp?.get('q') ?? '';
  const [q, setQ] = useState(qParam);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams(window.location.search);
      if (q) qs.set('q', q); else qs.delete('q');
      router.replace(`/search${qs.toString() ? `?${qs.toString()}` : ''}`, { scroll: false });
    }, 150);
    return () => clearTimeout(t);
  }, [q, router]);

  useEffect(() => { setQ(qParam); }, [qParam]);

  useEffect(() => {
    if (!q.trim()) { setItems([]); return; }
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    (async () => {
      try {
  const json = await fetchInternalAPI<{ items?: MediaItem[] }>(apiUrl(`search?q=${encodeURIComponent(q)}`), { cache: 'no-store', signal: ac.signal });
        setItems((json.items ?? []).slice(0, 20));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur py-4">
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search for titles"
          className="w-full rounded bg-zinc-900 border border-white/10 px-4 py-3 text-base outline-none focus:border-white/25"
        />
      </div>
      {loading && <p className="mt-6 text-sm text-zinc-400">Searching…</p>}
      {!loading && q && items.length === 0 && (
        <p className="mt-6 text-sm text-zinc-400">No results. Try a different search.</p>
      )}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map(it => (
          <MediaTile key={`${it.type}:${it.id}`} item={it} showQuickFav={false} />
        ))}
      </div>
    </div>
  );
}
