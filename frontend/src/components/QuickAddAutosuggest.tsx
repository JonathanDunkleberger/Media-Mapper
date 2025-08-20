"use client";
import { useEffect, useRef, useState } from 'react';
import { useToggleFavorite } from '@/hooks/useFavorites';
import { useToast } from '@/components/ui/ToastProvider';
import Link from 'next/link';
import { fetchInternalAPI } from '@/lib/api';
import { apiUrl } from '@/lib/api-base';

type Item = {
  id: string | number;
  type: 'movie' | 'tv' | 'game' | 'book';
  title: string;
  posterUrl?: string | null;
  year?: number | null;
  sublabel?: string | null;
};

export default function QuickAddAutosuggest() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const { add } = useToggleFavorite();
  const toast = useToast();

  useEffect(() => {
    if (!q.trim()) { setItems([]); setOpen(false); return; }
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const t = setTimeout(async () => {
      try {
  const json = await fetchInternalAPI<{ items?: Item[] }>(apiUrl(`search?q=${encodeURIComponent(q)}`), { cache: 'no-store', signal: ac.signal });
        setItems((json.items ?? []).slice(0, 10));
        setOpen(true);
        setCursor(0);
      } catch { /* ignore */ }
    }, 200);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q]);

  const commitAdd = (it: Item) => {
    // Cast to MediaItem compatible shape
  add.mutate({ id: Number(it.id), category: it.type, title: it.title, poster: it.posterUrl ?? undefined });
    setQ('');
    setOpen(false);
    toast(`Added “${it.title}” to favorites`, { type: 'success', ttl: 2500 });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); commitAdd(items[cursor]); }
    if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="relative w-full">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Add favorites…"
        className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 outline-none focus:border-white/25"
  aria-autocomplete="list"
      />
      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded border border-white/10 bg-zinc-950/95 backdrop-blur">
          {items.map((it, i) => (
            <div
              key={`${it.type}:${it.id}`}
              className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer ${i === cursor ? 'bg-white/10' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={e => { e.preventDefault(); commitAdd(it); }}
            >
              <div className="truncate">
                <div className="text-sm">{it.title}</div>
                <div className="text-xs text-zinc-400">{it.sublabel}</div>
              </div>
              <Link
                href={`/media/${it.type}/${it.id}`}
                className="text-xs text-zinc-300 hover:text-white px-2 py-1 rounded bg-white/5"
                onMouseDown={e => e.stopPropagation()}
                title="Open detail"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
