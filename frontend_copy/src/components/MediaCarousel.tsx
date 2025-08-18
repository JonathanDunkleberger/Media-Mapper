'use client';
import React from 'react';
import { MediaCard } from './MediaCard';
import type { KnownMedia } from '../types/media';
import { getId } from '../utils/mediaHelpers';

interface MediaCarouselProps {
  title: string;
  items: KnownMedia[];
  sectionId?: string;
}

export function MediaCarousel({ title, items = [], sectionId }: MediaCarouselProps) {
  if (!items.length) return null;
  return (
  <section className="mb-14" id={sectionId} data-section>
      <div className="flex items-center justify-between mb-4 pr-2">
        <h2 className="text-lg sm:text-xl font-semibold tracking-wide text-white/90">{title}</h2>
      </div>
      <div
        className="relative"
      >
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory pr-4" style={{ maskImage: 'linear-gradient(to right, transparent, black 28px, black calc(100% - 60px), transparent 100%)' }}>
          {items.map((item) => {
            const key = getId(item) ?? Math.random();
            return (
              <div className="snap-start flex-shrink-0" key={String(key)}>
                <MediaCard item={item} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}