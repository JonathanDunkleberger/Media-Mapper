"use client";
import { useEffect, useRef, useState } from 'react';
import { useFavoritesStore } from '@/store/favorites-zustand';
import { useToast } from '@/components/ui/ToastProvider';
import Link from 'next/link';
import { fetchInternalAPI } from '@/lib/api';
import { apiUrl } from '@/lib/api-base';
import type { MediaItem } from '@/lib/types';

export default function QuickAddAutosuggest() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const { addFavorite } = useFavoritesStore();
  const toast = useToast();

  useEffect(() => {
    if (!q.trim()) { setItems([]); setOpen(false); return; }
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const t = setTimeout(async () => {
      try {
        const json = await fetchInternalAPI<{ items?: MediaItem[] }>(apiUrl(`search?q=${encodeURIComponent(q)}`), { cache: 'no-store', signal: ac.signal });
        setItems((json.items ?? []).slice(0, 10));
        setOpen(true);
        setCursor(0);
      } catch { /* ignore */ }
    }, 200);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q]);

  const commitAdd = (item: MediaItem) => {
    addFavorite(item);
    setQ('');
    setOpen(false);
    toast(`Added "${item.title}" to favorites`, { type: 'success', ttl: 2500 });
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
        placeholder="Search and add to favorites..."
        className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 outline-none focus:border-white/25 placeholder-zinc-400"
        aria-autocomplete="list"
      />
      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded border border-white/10 bg-zinc-950/95 backdrop-blur">
          {items.map((item, i) => (
            <div
              key={`${item.type}:${item.id}`}
              className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer ${i === cursor ? 'bg-white/10' : 'hover:bg-white/5'}`}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={e => { e.preventDefault(); commitAdd(item); }}
            >
              <div className="truncate">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-zinc-400">{item.sublabel}</div>
              </div>
              <Link
                href={`/detail/${item.type}/${item.id}`}
                className="text-xs text-zinc-300 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                onMouseDown={e => e.stopPropagation()}
                title="View details"
              >
                Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}