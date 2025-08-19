

'use client';
import React from 'react';
import Image from 'next/image';
import { FaHeart } from 'react-icons/fa';
import Link from 'next/link';
import type { KnownMedia } from '../types/media';
import { isMovie, isBook, isGame } from '../types/media';
import { normalizeMediaData, getImageUrl } from '../utils/mediaHelpers';

type MediaCardProps = {
  item: KnownMedia;
};

function FavoriteButton({ id }: { id: string | number }) { // id reserved for future server sync
  const [isFavorite, setIsFavorite] = React.useState(false);
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
  const normalized = normalizeMediaData(item);
  const { id, title, type } = normalized;
  let imageUrl = '/placeholder-media.png';
  if (isMovie(item) || isGame(item) || isBook(item)) {
    imageUrl = getImageUrl(item);
  }

  // Always use normalized type for label and href
  let typeLabel = 'MEDIA';
  let href = '#';
  switch (type) {
    case 'movie':
      typeLabel = 'MOVIE';
      href = `/movie/${id}`;
      break;
    case 'tv':
      typeLabel = 'TV';
      href = `/tv/${id}`;
      break;
    case 'game':
      typeLabel = 'GAME';
      href = `/game/${id}`;
      break;
    case 'book':
      typeLabel = 'BOOK';
      href = `/book/${id}`;
      break;
    default:
  typeLabel = typeof type === 'string' && type ? (type as string).toUpperCase() : 'MEDIA';
      href = '#';
  }

  // Fallbacks for imageUrl and title
  const safeImageUrl = typeof imageUrl === 'string' && imageUrl.length > 0 ? imageUrl : '/placeholder-media.png';
  const safeTitle = typeof title === 'string' && title.length > 0 ? title : 'Media Poster';
  const safeId = id ?? safeTitle;

  return (
    <Link
      href={href}
      className="media-card group relative block w-[138px] sm:w-[160px] focus:outline-none"
      tabIndex={0}
    >
      <div className="relative rounded-xl overflow-hidden bg-[var(--xprime-surface)] ring-1 ring-[color-mix(in_oklab,var(--xprime-purple)_35%,#1f153a)] shadow-sm hover:shadow-lg hover:ring-[var(--xprime-purple)] transition-all duration-300">
        <div className="relative w-full" style={{ aspectRatio: '2 / 3' }}>
          <FavoriteButton id={safeId} />
          <Image
            src={safeImageUrl}
            alt={safeTitle}
            width={200}
            height={300}
            className="media-tile-image h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
          />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <span className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-black/60 backdrop-blur-sm text-[var(--xprime-purple-accent)] border border-[color-mix(in_oklab,var(--xprime-purple)_55%,#000)]">
            {typeLabel}
          </span>
          <div className="absolute bottom-0 inset-x-0 p-2 pt-6 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent">
            <h3 className="text-[11px] font-semibold leading-tight text-white line-clamp-2 min-h-[2.6em] drop-shadow">
              {safeTitle}
            </h3>
          </div>
        </div>
      </div>
    </Link>
  );
}