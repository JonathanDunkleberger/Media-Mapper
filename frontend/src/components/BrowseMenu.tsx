'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const CATS = [
  { cat:'movie', label:'Movies', icon:'🎬' },
  { cat:'tv',    label:'TV Shows', icon:'📺' },
  { cat:'game',  label:'Games', icon:'🎮' },
  { cat:'book',  label:'Books', icon:'📚' },
  { cat:'anime', label:'Anime', icon:'🍥' },
];

export default function BrowseMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => { onClose(); }, [pathname, onClose]);
  if (!open) return null;
  return (
    <div role="menu" className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur p-3 shadow-lg animate-in fade-in slide-in-from-top-2">
      <div className="grid grid-cols-2 gap-3">
        {CATS.map(c => (
          <Link key={c.cat} href={`/browse/${c.cat}`} className="rounded-lg bg-white/5 hover:bg-white/10 p-3 focus:outline-none focus:ring-2 focus:ring-white/30" onClick={onClose}>
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-1 text-sm">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
