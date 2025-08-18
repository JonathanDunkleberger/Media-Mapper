import React from 'react';
import Image from 'next/image';
import type { KnownMedia } from '../types/media';
import { getField } from '../utils/mediaHelpers';

type Video = { video_id?: string; key?: string; name?: string };

export function TrailerCarousel({ data, mediaType }: { data: KnownMedia | null; mediaType: string }) {
  // Movie/TV: data.videos.results, Game: data.videos
  const videos: Video[] | undefined = mediaType === 'game'
    ? getField<Video[]>(data as KnownMedia, 'videos')
    : getField<{ results?: Video[] }>(data as KnownMedia, 'videos')?.results;
  if (!videos || videos.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Trailers & Videos</h2>
      <div className="flex overflow-x-auto space-x-4 pb-2 scrollbar-hide">
        {videos.map((vid, i) => {
          const vidKey = vid.video_id ?? vid.key ?? String(i);
          const thumb = `https://img.youtube.com/vi/${vidKey}/hqdefault.jpg`;
          return (
            <a key={vidKey} href={`https://youtube.com/watch?v=${vidKey}`} target="_blank" rel="noopener noreferrer" className="block w-64 flex-shrink-0">
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-2">
                {/* YouTube thumbnail */}
                <Image src={thumb} alt={vid.name ?? ''} width={256} height={144} className="w-full h-full object-cover" />
              </div>
              <div className="text-gray-200 text-sm truncate">{vid.name}</div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
