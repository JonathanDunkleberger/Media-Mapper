'use client';
import Link from 'next/link';
import { SafeImage } from './SafeImage';
import type { MediaItem } from '@/lib/types';
import { useFavorites } from '@/store/favorites';
import { useSession } from '@/lib/useSession';
import { useToast } from '@/components/ui/ToastProvider';
import { fetchInternalAPI } from '@/lib/api';

export default function MediaTile({ item, showQuickFav = true }: { item: MediaItem; showQuickFav?: boolean }) {
  const { items, toggle } = useFavorites();
  const token = useSession();
  const isFav = items.some((i: MediaItem) => i.type === item.type && i.id === item.id);
  const push = useToast();
  return (
    <Link href={`/media/${item.type}/${item.id}`} className="group relative block">
      <div className="rounded-xl overflow-hidden bg-zinc-800/40 ring-1 ring-white/10">
        <SafeImage
          src={item.posterUrl || '/placeholder-media.png'}
          alt={item.title || 'Untitled'}
          w={300}
          h={450}
          className="h-[270px] w-[180px] object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/35 transition-colors" />
      <div className="absolute inset-x-1 bottom-1 flex items-start justify-between gap-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
        <div className="max-w-[75%] space-y-0.5">
          <p className="text-sm font-semibold leading-5 line-clamp-2 drop-shadow">{item.title || 'Untitled'}</p>
          <p className="text-[11px] text-zinc-200/90 tracking-wide font-medium">{(item.type && typeof item.type === 'string' ? item.type.toUpperCase() : 'MEDIA')}{item?.year ? ` • ${item.year}` : ''}</p>
        </div>
  {showQuickFav && <button
          aria-label={isFav ? 'Remove Favorite' : 'Add Favorite'}
          onClick={async (e) => {
            e.preventDefault();
            const wasFav = isFav;
            // optimistic
            toggle(item);
            if (token) {
              try {
                await fetchInternalAPI(`/api/favorites`, {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ action: wasFav ? 'remove' : 'add', item }),
                });
                push(wasFav ? 'Removed from favorites' : 'Added to favorites', { type: 'success', ttl: 2500 });
              } catch {
                // rollback
                toggle(item);
                push('Favorite update failed', { type: 'error' });
              }
            } else {
              push(wasFav ? 'Removed locally' : 'Added locally', { type: 'info', ttl: 2000 });
            }
          }}
          className={`pointer-events-auto rounded-full px-2 py-1 text-xs font-bold transition ${isFav ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-white/90 text-black hover:bg-white'}`}
  >{isFav ? '✓' : '＋'}</button>}
      </div>
    </Link>
  );
}
