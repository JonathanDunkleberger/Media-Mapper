'use client';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import Link from 'next/link';
import Image from 'next/image';

export default function FavoritesGrid() {
  const { data: favs = [] } = useFavorites();
  const { remove } = useToggleFavorite();
  const items = favs.map(f => ({ id: f.id, type: f.category, title: f.title, posterUrl: f.poster ?? null, sublabel: '' }));
  if (items.length === 0) return <p className="text-sm text-zinc-400">You have no favorites yet.</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map(it => (
        <div key={`${it.type}:${it.id}`} className="group relative rounded-lg overflow-hidden bg-zinc-900/60 ring-1 ring-white/10">
          <Link href={`/detail/${it.type}/${it.id}`} className="block">
            {it.posterUrl ? (
              <Image src={it.posterUrl} alt={it.title} width={300} height={450} className="w-full h-48 object-cover group-hover:opacity-90 transition" />
            ) : (
              <div className="w-full h-48 bg-white/5" />
            )}
          </Link>
          <div className="p-2 space-y-1">
            <p className="text-xs font-medium leading-4 line-clamp-2 min-h-[32px]">{it.title}</p>
            <p className="text-[10px] text-zinc-400">{it.sublabel}</p>
            <div className="flex justify-between items-center pt-1">
              <Link href={`/detail/${it.type}/${it.id}`} className="text-[10px] rounded bg-white/10 px-2 py-1 hover:bg-white/20">Open</Link>
              <button onClick={() => remove.mutate(Number(it.id))} className="text-[10px] rounded bg-rose-500/90 hover:bg-rose-500 px-2 py-1" aria-label={`Remove ${it.title}`}>Remove</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
