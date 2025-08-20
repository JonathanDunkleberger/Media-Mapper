"use client";
import { useEffect, useRef, useState } from 'react';
import { useToggleFavorite } from '@/hooks/useFavorites';
import { useToast } from '@/components/ui/ToastProvider';
import { SafeImage } from './SafeImage';
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

export default function SearchAndAddAutosuggest() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const { add } = useToggleFavorite();
  const toast = useToast();

  useEffect(() => {
    if (!q.trim()) { setItems([]); setOpen(false); return; }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const json = await fetchInternalAPI<{ items?: Item[] }>(
          apiUrl(`search?q=${encodeURIComponent(q)}`),
          { signal: controller.signal, cache: 'no-store' }
        );
        setItems(Array.isArray(json.items) ? json.items.slice(0, 8) : []);
        setOpen(true);
        setHighlight(0);
      } catch {
        // ignore search errors
      }
    }, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [q]);

  const addToFavorites = (item: Item) => {
    // Cast to MediaItem compatible shape
    add.mutate({ 
      id: Number(item.id), 
      category: item.type, 
      title: item.title, 
      poster: item.posterUrl ?? undefined 
    });
    setQ('');
    setOpen(false);
    toast(`Added "${item.title}" to favorites`, { type: 'success', ttl: 2500 });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') { 
      e.preventDefault(); 
      setHighlight(h => Math.min(h + 1, items.length - 1)); 
    }
    else if (e.key === 'ArrowUp') { 
      e.preventDefault(); 
      setHighlight(h => Math.max(h - 1, 0)); 
    }
    else if (e.key === 'Enter') { 
      e.preventDefault(); 
      const item = items[highlight];
      if (item) addToFavorites(item);
    }
    else if (e.key === 'Escape') { 
      setOpen(false); 
    }
  };

  return (
    <div className="relative w-full" ref={boxRef}>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onFocus={() => items.length && setOpen(true)}
        placeholder="Search movies, shows, games, books…"
        className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 outline-none focus:border-white/25 text-white placeholder-zinc-400"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && items.length > 0 && (
        <ul 
          role="listbox" 
          className="absolute z-50 mt-1 w-full rounded border border-white/10 bg-zinc-950/95 backdrop-blur max-h-96 overflow-y-auto"
        >
          {items.map((item, idx) => (
            <li
              key={`${item.type}:${item.id}`}
              role="option"
              aria-selected={highlight === idx}
              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 ${
                idx === highlight ? 'bg-white/10' : ''
              }`}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={e => { 
                e.preventDefault(); 
                addToFavorites(item); 
              }}
            >
              <SafeImage 
                src={item.posterUrl ?? null} 
                alt={item.title} 
                w={40} 
                h={60} 
                className="h-[60px] w-[40px] object-cover rounded flex-shrink-0" 
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-white">{item.title}</div>
                {item.sublabel && (
                  <div className="text-xs text-zinc-400 truncate">{item.sublabel}</div>
                )}
              </div>
              <div className="text-xs text-zinc-300 px-2 py-1 rounded bg-white/10 flex-shrink-0">
                Add
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && items.length === 0 && q.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded border border-white/10 bg-zinc-950/95 backdrop-blur p-3">
          <div className="text-sm text-zinc-400">No matches found for "{q}"</div>
        </div>
      )}
    </div>
  );
}