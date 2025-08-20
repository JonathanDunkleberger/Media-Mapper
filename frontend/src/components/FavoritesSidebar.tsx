"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import { RecommendButton, ShowTrendingButton } from '@/components/RecommendControls';
import { XMarkIcon } from '@heroicons/react/24/solid';

type Variant = 'stack' | 'list';

export default function FavoritesSidebar({
  variant = 'stack',
  minForRecommend = 8,
  embedded = false,
}: { variant?: Variant; minForRecommend?: number; embedded?: boolean }) {
  const { data: favs = [] } = useFavorites();
  const { remove } = useToggleFavorite();
  const [open, setOpen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const items = favs.map(f => ({ id: f.id, type: f.category, title: f.title, posterUrl: f.poster ?? null, sublabel: '' }));
  const count = items.length;
  const prevCount = useRef(count);
  useEffect(() => {
    if (count > prevCount.current) {
      const last = items[items.length - 1];
      if (last) setHighlightId(`${last.type}:${last.id}`);
      rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      const t = setTimeout(() => setHighlightId(null), 1400);
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count, items]);

  const canRecommend = useMemo(() => items.length >= minForRecommend, [items.length, minForRecommend]);
  const stackItems = useMemo(() => variant === 'stack' ? [...items].reverse() : items, [items, variant]);

  const Container: React.ElementType = embedded ? 'div' : 'aside';
  const baseClasses = embedded
    ? 'flex flex-col h-full'
    : 'fixed right-0 top-14 bottom-0 z-30 w-[260px] md:w-[300px] lg:w-[320px] border-l border-white/10 bg-zinc-950/70 backdrop-blur hidden lg:flex flex-col';
  return (
    <Container className={baseClasses}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Favorites</span>
          <span className="text-xs rounded bg-white/10 px-2 py-[2px]">{items.length}</span>
        </div>
        <button
          className="rounded px-2 py-1 text-xs bg-white/5 hover:bg-white/10"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle favorites panel"
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      <div ref={rootRef} className={`flex-1 overflow-auto px-3 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {items.length === 0 && (
          <div className="text-xs text-zinc-400 mt-4 pr-2">
            Use the “Add favorites…” bar to add titles. When ready, hit <span className="font-semibold">Recommend</span> for personalized rows.
          </div>
        )}
        {variant === 'stack' ? (
          <div className="relative mt-3 pb-24">
            {stackItems.map((it, idx) => {
              const key = `${it.type}:${it.id}`;
              const top = idx * 44;
              const isHighlight = key === highlightId;
              return (
                <div key={key} className="group absolute left-0 right-0" style={{ top }}>
                  <div className={`relative rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-900 transition-colors shadow grid grid-cols-[48px_1fr_auto] gap-2 items-center px-2 py-2 ${isHighlight ? 'ring-2 ring-indigo-400/70' : ''}`}>
                    <div className="relative w-12 h-16 overflow-hidden rounded">
                      {it.posterUrl ? (
                        <Image src={it.posterUrl} alt={it.title} fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="w-full h-full bg-white/5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium leading-4">{it.title}</div>
                      <div className="truncate text-[10px] text-zinc-400">{it.sublabel}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/detail/${it.type}/${it.id}`} className="text-[10px] rounded bg-white/10 px-2 py-1 hover:bg-white/20" title="Open detail">Open</Link>
                      <button onClick={() => remove.mutate(Number(it.id))} className="p-1 rounded hover:bg-white/10" aria-label={`Remove ${it.title}`} title="Remove"><XMarkIcon className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ height: stackItems.length * 44 + 80 }} />
          </div>
        ) : (
          <div className="mt-3 grid gap-2 pb-24">
            {items.map(it => (
              <div key={`${it.type}:${it.id}`} className="relative rounded-lg border border-white/10 bg-zinc-900/80 grid grid-cols-[48px_1fr_auto] gap-2 items-center px-2 py-2">
                <div className="relative w-12 h-16 overflow-hidden rounded">
                  {it.posterUrl ? <Image src={it.posterUrl} alt={it.title} fill className="object-cover" sizes="48px" /> : <div className="w-full h-full bg-white/5" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium leading-4">{it.title}</div>
                  <div className="truncate text-[10px] text-zinc-400">{it.sublabel}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/detail/${it.type}/${it.id}`} className="text-[10px] rounded bg-white/10 px-2 py-1 hover:bg-white/20">Open</Link>
                  <button onClick={() => remove.mutate(Number(it.id))} className="p-1 rounded hover:bg-white/10" aria-label={`Remove ${it.title}`}><XMarkIcon className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-white/10 p-3 bg-zinc-950/80 space-y-2">
        <div className="flex gap-2">
          <RecommendButton />
          <ShowTrendingButton />
        </div>
        {!canRecommend && (
          <div className="text-[10px] leading-4 text-zinc-400">Add at least <b>{minForRecommend}</b> favorites for best recommendations.</div>
        )}
      </div>
  </Container>
  );
}
