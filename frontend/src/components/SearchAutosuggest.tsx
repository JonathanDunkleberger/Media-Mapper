"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SafeImage } from './SafeImage';
import type { MediaItem } from '@/lib/types';
import { fetchInternalAPI } from '@/lib/api';
import { apiUrl } from '@/lib/api-base';

export default function SearchAutosuggest() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) { setItems([]); setOpen(false); return; }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
  const json = await fetchInternalAPI<{ items?: MediaItem[] }>(apiUrl(`search?q=${encodeURIComponent(q)}`), { signal: controller.signal, cache: 'no-store' });
  setItems(Array.isArray(json.items) ? json.items.slice(0, 10) : []);
        setOpen(true);
        setHighlight(0);
      } catch {}
    }, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [q]);

  const onKey: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(items.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') {
      const it = items[highlight];
      if (it) window.location.href = `/detail/${it.type}/${it.id}`;
    } else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="relative" ref={boxRef}>
      <div aria-expanded={open} aria-haspopup="listbox">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search movies, shows, games, books…"
        className="w-full rounded-md bg-zinc-900 border border-white/10 px-3 py-2 outline-none focus:border-white/25"
        aria-autocomplete="list"
        aria-controls="autosuggest-list"
      />
      </div>
      {open && (
        <ul id="autosuggest-list" role="listbox" className="absolute z-10 mt-2 w-full rounded-md border border-white/10 bg-zinc-950/95 backdrop-blur p-2 max-h-96 overflow-y-auto">
          {items.map((it, idx) => (
            <li key={`${it.type}-${it.id}`} role="option" aria-selected={highlight === idx}>
              <Link
                href={`/detail/${it.type}/${it.id}`}
                className={`flex items-center gap-3 rounded p-2 hover:bg-white/5 ${highlight === idx ? 'bg-white/10' : ''}`}
                onMouseEnter={() => setHighlight(idx)}
              >
                <SafeImage src={it.posterUrl ?? null} alt={it.title} w={40} h={60} className="h-[60px] w-[40px] object-cover rounded" />
                <div className="flex-1">
                  <div className="text-sm font-medium line-clamp-1">{it.title}</div>
                  {it.sublabel && <div className="text-xs text-zinc-400 line-clamp-1">{it.sublabel}</div>}
                </div>
              </Link>
            </li>
          ))}
          {!items.length && <li className="p-2 text-sm text-zinc-400">No matches.</li>}
        </ul>
      )}
    </div>
  );
}
