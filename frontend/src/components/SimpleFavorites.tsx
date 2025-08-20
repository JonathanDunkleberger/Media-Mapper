"use client";
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import Image from 'next/image';

export default function SimpleFavorites() {
  const { data: favs = [] } = useFavorites();
  const { remove } = useToggleFavorite();
  if (!favs.length) return <div className="text-xs text-zinc-400">Add favorites using the search bar.</div>;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold tracking-wide text-zinc-300">Favorites <span className="text-xs font-normal ml-1 bg-white/10 rounded px-1.5 py-[1px]">{favs.length}</span></h3>
      <ul className="space-y-2">
        {favs.map(f => (
          <li key={`${f.category}:${f.id}`} className="flex gap-2 items-center group">
            <div className="relative w-9 h-14 rounded overflow-hidden bg-white/5">
              {f.poster && (
                <Image src={f.poster} alt={f.title} fill sizes="36px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] leading-4 font-medium">{f.title}</div>
              <div className="text-[10px] text-zinc-500 uppercase">{f.category}</div>
            </div>
            <button
              aria-label={`Remove ${f.title}`}
              onClick={() => remove.mutate(f.id)}
              className="text-[10px] px-1 py-0.5 rounded bg-white/5 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition"
            >×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
