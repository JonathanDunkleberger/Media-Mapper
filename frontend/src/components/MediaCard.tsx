

'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { FaHeart } from 'react-icons/fa';
import Link from 'next/link';
import type { KnownMedia } from '../types/media';
import { isMovie, isTV, isBook, isGame } from '../types/media';
import { getImageUrl, getTitle, getId } from '../utils/mediaHelpers';

type MediaCardProps = {
  item: KnownMedia;
};

// Simple local favorite state (for demo; replace with persistent storage as needed)
function FavoriteButton({ id }: { id: string | number }) {
  const [isFavorite, setIsFavorite] = useState(false);
  return (
    <button
      onClick={e => {
        e.preventDefault();
        setIsFavorite(f => !f);
      }}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      className={isFavorite ? 'text-red-500' : 'text-gray-400'}
      style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, background: 'none', border: 'none' }}
    >
      <FaHeart />
    </button>
  );
}

export function MediaCard({ item }: MediaCardProps) {
  const initialImg = getImageUrl(item) ?? '';
  const stdImage = (typeof item === 'object' && item && 'image' in item) ? (item as { image?: { aspectRatio?: number } }).image : undefined;
  const aspectRatio = useMemo(() => {
    if (stdImage && typeof stdImage.aspectRatio === 'number' && stdImage.aspectRatio > 0) {
      return stdImage.aspectRatio.toFixed(4);
    }
    return null;
  }, [stdImage]);
  const [imgSrc, setImgSrc] = useState(initialImg);
  const title = getTitle(item) || 'Untitled';
  const id = getId(item);
  const typeLabel = isMovie(item) ? 'MOVIE' : isTV(item) ? 'TV' : isGame(item) ? 'GAME' : 'BOOK';
  const fallback = 'https://placehold.co/400x600/120e24/8b5cf6?text=No+Image';
  const href = isBook(item)
    ? `/book/${id}`
    : isMovie(item)
    ? `/movie/${id}`
    : isTV(item)
    ? `/tv/${id}`
    : isGame(item)
    ? `/game/${id}`
    : '#';

  const handleError = useCallback(() => {
    if (imgSrc !== fallback) setImgSrc(fallback);
  }, [imgSrc]);

  return (
    <Link
      href={href}
      className="media-card group relative block w-[138px] sm:w-[160px] focus:outline-none"
      tabIndex={0}
    >
      <div className="relative rounded-xl overflow-hidden bg-[var(--xprime-surface)] ring-1 ring-[color-mix(in_oklab,var(--xprime-purple)_35%,#1f153a)] shadow-sm hover:shadow-lg hover:ring-[var(--xprime-purple)] transition-all duration-300">
        <div className="relative w-full" style={{ aspectRatio: aspectRatio ? aspectRatio : '2 / 3' }}>
          <FavoriteButton id={id ?? title} />
          {imgSrc ? (
            <img
              src={imgSrc}
              onError={handleError}
              alt={title}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.06]"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-[var(--xprime-surface-alt)] text-[var(--xprime-muted)] text-xs">No Image</div>
          )}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <span className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-black/60 backdrop-blur-sm text-[var(--xprime-purple-accent)] border border-[color-mix(in_oklab,var(--xprime-purple)_55%,#000)]">
            {typeLabel}
          </span>
          <div className="absolute bottom-0 inset-x-0 p-2 pt-6 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent">
            <h3 className="text-[11px] font-semibold leading-tight text-white line-clamp-2 min-h-[2.6em] drop-shadow">
              {title}
            </h3>
          </div>
        </div>
      </div>
    </Link>
  );
}