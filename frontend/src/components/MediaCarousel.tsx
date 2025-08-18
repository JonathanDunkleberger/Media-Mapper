'use client';
import React from 'react';
import { MediaCard } from './MediaCard';
import type { KnownMedia } from '../types/media';
import { getId } from '../utils/mediaHelpers';

interface MediaCarouselProps {
  title: string;
  items: KnownMedia[];
  sectionId?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function MediaCarousel({ title, items = [], sectionId, loading = false, emptyMessage = 'No items available.' }: MediaCarouselProps) {
  const showEmpty = !loading && items.length === 0;
  return (
    <section className="media-carousel-section full-bleed-section mb-12" id={sectionId} data-section>
      <div className="media-carousel-inner content-wrapper">
        <div className="media-carousel-header flex items-center justify-between mb-4 pr-2">
          <h2 className="media-carousel-title text-lg sm:text-xl font-semibold tracking-wide text-white/90">{title}</h2>
          {loading && <span className="text-xs text-white/60 animate-pulse">Loading...</span>}
        </div>
        {showEmpty ? (
          <div className="text-xs text-white/40 px-2 py-6 font-medium select-none">{emptyMessage}</div>
        ) : (
          <div className="media-carousel-track-wrapper relative">
            <div className="media-carousel-track flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory pr-4" style={{ maskImage: 'linear-gradient(to right, transparent, black 28px, black calc(100% - 60px), transparent 100%)' }}>
              {items.map((item) => {
                const key = getId(item) ?? Math.random();
                return (
                  <div className="media-carousel-item snap-start flex-shrink-0" key={String(key)}>
                    <MediaCard item={item} />
                  </div>
                );
              })}
              {loading && items.length === 0 && (
                <div className="h-[240px] flex items-center text-white/40 text-xs">Preparing recommendations...</div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}