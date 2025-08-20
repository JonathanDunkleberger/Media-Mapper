"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFavorites } from '@/hooks/useFavorites';
import { useFavoritesDrawer } from '@/components/FavoritesDrawer';
import { RecommendButton, ShowTrendingButton } from '@/components/RecommendControls';

export default function HeaderActions() {
  const { data: favs = [] } = useFavorites();
  const favCount = favs.length;
  const pathname = usePathname();
  const openDrawer = useFavoritesDrawer.getState?.().open; // safe access before store initialises
  const onHome = pathname === '/';

  return (
    <div className="flex items-center gap-2 ml-auto">
      {/* Mobile heart toggler only on Home */}
      {onHome && (
        <button
          className="relative p-2 rounded hover:bg-white/10 text-zinc-300 hover:text-white lg:hidden"
          onClick={() => openDrawer && openDrawer()}
          aria-label="Open favorites"
          disabled={!openDrawer}
        >
          <span>❤</span>
          {favCount > 0 && (
            <span className="absolute -right-1 -top-1 text-[10px] rounded-full bg-white text-black px-[6px] py-[1px]">
              {favCount}
            </span>
          )}
        </button>
      )}
      <RecommendButton />
      <ShowTrendingButton />
    </div>
  );
}
