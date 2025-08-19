'use client';
import { useEffect, useRef, useState } from 'react';

export type Mode = 'popular' | 'trending' | 'top_rated';
export type Cat = 'movie' | 'tv' | 'anime' | 'game' | 'book';
export type GenreOpt = { id: string; label: string };

export default function FilterBar({
  cat,
  mode,
  setMode,
  allGenres,
  selectedGenres,
  setSelectedGenres,
  loadedCount,
}: {
  cat: Cat;
  mode: Mode;
  setMode: (m: Mode) => void;
  allGenres: GenreOpt[];
  selectedGenres: string[];
  setSelectedGenres: (ids: string[]) => void;
  loadedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Hydrate saved genres for this category
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(`selectedGenres-${cat}`);
        if (saved && selectedGenres.length === 0) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length) setSelectedGenres(parsed);
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  // Persist whenever selectedGenres changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`selectedGenres-${cat}`, JSON.stringify(selectedGenres));
      }
    } catch { /* ignore */ }
  }, [selectedGenres, cat]);

  const canTrending = cat === 'movie' || cat === 'tv' || cat === 'anime';
  const canTop = true;
  const pills: { key: Mode; label: string; enabled: boolean }[] = [
    { key: 'popular', label: 'Popular', enabled: true },
    { key: 'trending', label: 'Trending', enabled: canTrending },
    { key: 'top_rated', label: 'Top Rated', enabled: canTop },
  ];

  return (
    <div className="sticky top-14 z-10 bg-zinc-950/80 backdrop-blur pt-4 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        {pills.map(p => (
          <button
            key={p.key}
            disabled={!p.enabled}
            onClick={() => setMode(p.key)}
            className={`px-3 py-1.5 rounded text-sm border ${mode === p.key ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'} ${!p.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >{p.label}</button>
        ))}
        <div className="relative" ref={boxRef}>
          <button onClick={() => setOpen(o => !o)} className="px-3 py-1.5 rounded text-sm bg-white/5 border border-white/10 hover:bg-white/10 inline-flex items-center gap-1">Genres ▾</button>
          {open && (
            <div className="absolute mt-2 w-64 max-h-72 overflow-auto rounded-lg border border-white/10 bg-zinc-950/95 backdrop-blur p-2 z-50">
              {allGenres.length === 0 && <div className="text-xs text-zinc-400 px-1 py-2">No genres available</div>}
              {allGenres.map(g => {
                const active = selectedGenres.includes(g.id);
                return (
                  <label key={g.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${active ? 'bg-white/10' : ''}`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => {
                        const next = active ? selectedGenres.filter(x => x !== g.id) : [...selectedGenres, g.id];
                        setSelectedGenres(next);
                      }}
                    />
                    <span className="text-sm">{g.label}</span>
                  </label>
                );
              })}
              {selectedGenres.length > 0 && (
                <button className="mt-2 w-full text-xs rounded bg-white text-black py-1" onClick={() => setSelectedGenres([])}>Clear</button>
              )}
            </div>
          )}
        </div>
        <div className="ml-auto text-xs text-zinc-400">{loadedCount} loaded</div>
      </div>
      {selectedGenres.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedGenres.map(id => {
            const label = allGenres.find(g => g.id === id)?.label ?? id;
            return (
              <span key={id} className="inline-flex items-center gap-1 text-xs bg-white/10 rounded px-2 py-1">
                {label}
                <button onClick={() => setSelectedGenres(selectedGenres.filter(x => x !== id))}>×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
