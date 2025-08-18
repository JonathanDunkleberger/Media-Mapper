import React from 'react';
import type { KnownMedia } from '../types/media';
import { getImageUrl, getTitle, getField } from '../utils/mediaHelpers';

export function MediaDetailHero({ data, mediaType }: { data: KnownMedia | null; mediaType: string }) {
  // Movie/TV: Use backdrop_path, title/name, overview, release_date, vote_average, credits
  // Game: Use cover, name, summary, first_release_date, rating, involved_companies
  const isGame = mediaType === 'game';
  const screenshots = getField<{ url?: string }[]>(data as KnownMedia, 'screenshots');
  const bgImage = isGame
    ? screenshots?.[0]?.url?.replace('t_thumb', 't_screenshot_big')
    : (getImageUrl(data as KnownMedia) ? `https://image.tmdb.org/t/p/original${getField<string>(data as KnownMedia, 'backdrop_path') ?? ''}` : undefined);
  const title = getTitle(data as KnownMedia);
  const year = (getField<string>(data as KnownMedia, 'release_date') || getField<string>(data as KnownMedia, 'first_release_date') || '').slice(0, 4);
  const rating = getField<number>(data as KnownMedia, 'vote_average') ?? getField<number>(data as KnownMedia, 'rating');
  const summary = getField<string>(data as KnownMedia, 'overview') ?? getField<string>(data as KnownMedia, 'summary');

  return (
    <section className="relative h-[60vh] flex items-end mb-8" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      <div className="relative z-10 p-8 max-w-2xl">
        <h1 className="text-4xl font-extrabold mb-2">{title} <span className="text-gray-400 text-2xl font-normal">({year})</span></h1>
        <div className="flex items-center gap-4 mb-4">
          {rating && <span className="bg-cyan-600 px-3 py-1 rounded text-lg font-bold">★ {Number(rating).toFixed(1)}</span>}
        </div>
        <p className="mb-6 text-lg text-gray-200 line-clamp-5">{summary}</p>
        {/* Add creators/cast info here if available */}
        {/* Action buttons */}
        {(() => {
          const videos = getField<{ results?: Array<Record<string, unknown>> }>(data as KnownMedia, 'videos');
          if (videos && videos.results && videos.results.length > 0) {
            const key = videos.results[0].key as string | undefined;
            if (key) return (<a href={`https://youtube.com/watch?v=${key}`} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded shadow transition inline-block">Play Trailer</a>);
          }
          return null;
        })()}
      </div>
    </section>
  );
}
