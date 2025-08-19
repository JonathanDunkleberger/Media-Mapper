'use client';
import Link from 'next/link';
import { SafeImage } from './SafeImage';

export type MediaType = 'movie' | 'tv' | 'game' | 'book';
export type MediaItem = {
  id: number | string;
  type: MediaType;
  title: string;
  year?: string | number | null;
  posterUrl: string | null;
};

export default function MediaTile({ item }: { item: MediaItem }) {
  return (
    <Link href={`/media/${item.type}/${item.id}`} className="group relative block">
      <div className="rounded-xl overflow-hidden bg-zinc-800/40 ring-1 ring-white/10">
        <SafeImage
          src={item.posterUrl}
          alt={item.title}
          w={300}
          h={450}
          className="h-[270px] w-[180px] object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/35 transition-colors" />
      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
        <div className="max-w-[75%]">
          <p className="text-sm font-semibold leading-5 line-clamp-2">{item.title}</p>
          <p className="text-[11px] text-zinc-300/80">{item.type.toUpperCase()}{item.year ? ` • ${item.year}` : ''}</p>
        </div>
        <button aria-label="Favorite" className="pointer-events-auto rounded-full bg-white/90 px-2 py-1 text-xs text-black hover:bg-white">＋</button>
      </div>
    </Link>
  );
}
