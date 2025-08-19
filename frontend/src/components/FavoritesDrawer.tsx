"use client";
import { create } from 'zustand';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import FavoritesSidebar from '@/components/FavoritesSidebar';

interface DrawerState { isOpen: boolean; open: () => void; close: () => void; toggle: () => void; }
export const useFavoritesDrawer = create<DrawerState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set(s => ({ isOpen: !s.isOpen })),
}));

export default function FavoritesDrawer() {
  const { isOpen, close } = useFavoritesDrawer();
  const pathname = usePathname();
  useEffect(() => { close(); }, [pathname, close]);
  // Only render on home route (server component will gate mounting, but double-check client)
  const onHome = pathname === '/';
  if (!onHome) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={close}
      />
      <div
        className={`fixed top-14 bottom-0 right-0 w-[88%] max-w-[360px] bg-zinc-950 border-l border-white/10 transition-transform duration-300 ease-out lg:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true"
      >
        <FavoritesSidebar variant="list" embedded />
      </div>
    </>
  );
}
