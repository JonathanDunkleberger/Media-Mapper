
'use client';
import React from 'react';

// A flexible type that can handle movies or games
interface HeroItem {
  name?: string;          // For games/TV
  title?: string;         // For movies
  overview?: string;      // For movies/TV
  backdrop_path?: string; // For movies/TV
  background_image?: string; // For games
}

interface HeroProps {
  item?: HeroItem | null;
  children?: React.ReactNode;
}

export function Hero({ item, children }: HeroProps) {
  const imageUrl = item?.background_image || (item?.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '');
  const title = item?.name || item?.title;
  const description = item?.overview;

  return (
    <div className="relative mb-10 w-full overflow-hidden rounded-2xl group ring-1 ring-[color-mix(in_oklab,var(--xprime-purple)_25%,#201433)] bg-[var(--xprime-bg-alt)]" style={{ minHeight: '340px' }}>
      {/* Background layer */}
      {imageUrl ? (
        <div
          className="absolute inset-0 bg-center bg-cover scale-100 group-hover:scale-[1.03] transition-transform duration-[3200ms] ease-out"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[var(--xprime-gradient-hero)]" />
      )}
      {/* Radial accent */}
      <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 35% 40%, rgba(139,92,246,0.55), transparent 60%)' }} />
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-black/30" />
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-10 py-10 gap-6 max-w-5xl">
        {title && (
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent drop-shadow-md">
              {title}
            </h1>
            {description && (
              <p className="text-sm md:text-base text-white/70 max-w-2xl leading-relaxed line-clamp-3">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
      {/* Edge fade */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--xprime-bg)] to-transparent pointer-events-none" />
    </div>
  );
}