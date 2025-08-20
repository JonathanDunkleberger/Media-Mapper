'use client';
import { useRef } from 'react';
import MediaTile from './MediaTile';
import type { MediaItem } from '@/lib/types';

export default function MediaRowCarousel({ title, items }: { title: string; items: MediaItem[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const page = () => scroller.current?.clientWidth ?? 0;
  const scrollBy = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: 'smooth' });

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex gap-2">
          <button type="button" aria-label="Scroll left" onClick={() => scrollBy(-page())} className="rounded-full bg-white/10 w-8 h-8 flex items-center justify-center hover:bg-white/20">←</button>
          <button type="button" aria-label="Scroll right" onClick={() => scrollBy(page())} className="rounded-full bg-white/10 w-8 h-8 flex items-center justify-center hover:bg-white/20">→</button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none]"
      >
        <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
        {items.map((it) => (
          <div key={`${it.type}-${it.id}`} className="shrink-0">
            <MediaTile item={it} />
          </div>
        ))}
      </div>
    </section>
  );
}
