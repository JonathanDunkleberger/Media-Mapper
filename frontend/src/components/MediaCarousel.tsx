'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MediaCard } from './MediaCard';
import type { KnownMedia } from '../types/media';
import { getId } from '../utils/mediaHelpers';

interface MediaCarouselProps {
  title: string;
  mediaType: string;
  sectionId?: string;
  emptyMessage?: string;
}

export function MediaCarousel({ title, mediaType, sectionId, emptyMessage = 'No items available.' }: MediaCarouselProps) {
  const [items, setItems] = useState<KnownMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/${mediaType}`);
        setItems(response.data);
      } catch (err) {
        setError('Error loading data. Showing fallback.');
        setItems([{ title: 'Sample Item', id: 1 } as any]);
        // Optionally log error
        // eslint-disable-next-line no-console
        console.error(`Error loading ${mediaType}:`, err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [mediaType]);

  const showEmpty = !loading && items.length === 0;
  return (
    <section className="media-carousel-section full-bleed-section mb-12" id={sectionId} data-section>
      <div className="media-carousel-inner content-wrapper">
        <div className="media-carousel-header flex items-center justify-between mb-4 pr-2">
          <h2 className="media-carousel-title text-lg sm:text-xl font-semibold tracking-wide text-white/90">{title}</h2>
          {loading && <span className="text-xs text-white/60 animate-pulse">Loading...</span>}
        </div>
        {error && <div className="text-xs text-red-400 px-2 py-2 font-medium select-none">{error}</div>}
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