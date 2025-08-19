'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CATS = [
  { cat:'movie', label:'Movies', icon:'🎬' },
  { cat:'tv',    label:'TV Shows', icon:'📺' },
  { cat:'game',  label:'Games', icon:'🎮' },
  { cat:'book',  label:'Books', icon:'📚' },
  { cat:'anime', label:'Anime', icon:'🍥' },
];

export default function BrowseModal() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    // CustomEvent typing fallback
    const handler = () => onOpen();
    document.addEventListener('open-browse-modal', handler as EventListener);
    return () => document.removeEventListener('open-browse-modal', handler as EventListener);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity md:hidden ${open?'opacity-100':'pointer-events-none opacity-0'}`} onClick={() => setOpen(false)} />
      <div className={`fixed inset-x-0 top-0 bottom-0 md:hidden transition-transform duration-300 ${open?'translate-y-0':'translate-y-full'}`} aria-modal={open} role="dialog">
        <div className="mx-auto max-w-md p-6 bg-zinc-950 h-full overflow-auto">
          <h2 className="text-lg mb-4 font-semibold flex items-center justify-between">Browse <button onClick={()=>setOpen(false)} className="text-sm rounded px-2 py-1 bg-white/10 hover:bg-white/20">Close</button></h2>
          <div className="grid grid-cols-2 gap-3">
            {CATS.map(c => (
              <Link key={c.cat} href={`/browse/${c.cat}`} className="rounded-lg bg-white/5 p-4 text-center hover:bg-white/10 active:bg-white/15" onClick={()=>setOpen(false)}>
                <div className="text-3xl">{c.icon}</div>
                <div className="mt-2 text-sm font-medium">{c.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
