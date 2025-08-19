'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import BrowseMenu from './BrowseMenu';
import BrowseModal from './BrowseModal';

export default function BrowseTrigger() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(()=>setOpen(false),[]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        className="px-3 py-2 rounded hover:bg-white/10 hidden md:inline-flex text-sm font-medium"
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen(v => !v)}
      >Browse</button>
      <BrowseMenu open={open} onClose={close} />
      <BrowseModal />
      <button className="px-3 py-2 rounded hover:bg-white/10 md:hidden text-sm font-medium"
        onClick={() => document.dispatchEvent(new CustomEvent('open-browse-modal'))}
        aria-label="Open browse"
      >Browse</button>
    </div>
  );
}
