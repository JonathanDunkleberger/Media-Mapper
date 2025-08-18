
'use client';
import React from 'react';
import Image from 'next/image';
import type { KnownMedia } from '../types/media';
import { getId, getTitle, getImageUrl, getMediaType } from '../utils/mediaHelpers';

type InLoveListProps = {
  items: KnownMedia[];
  onRemove: (id: string | number) => void;
  variant?: 'default' | 'sidebar';
  className?: string;
};

export function InLoveList({ items, onRemove, variant = 'default', className = '' }: InLoveListProps) {
  if (!items.length) return null;
  if (variant === 'sidebar') {
    return (
      <div className={"flex flex-col h-full " + className}>
        <h2 className="text-lg font-semibold mb-3 px-2">Favorites</h2>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700">
          {items.map(item => {
            const id = getId(item) ?? undefined;
            const title = getTitle(item);
            const image = getImageUrl(item) ?? 'https://placehold.co/100x150';
            const mediaType = getMediaType(item) ?? '';
            return (
              <div key={`${id}_${mediaType}`} className="group relative flex items-center gap-3 rounded-md bg-gray-800/70 hover:bg-gray-700 transition p-2">
                <button
                  className="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-sm"
                  onClick={() => onRemove(id ?? '')}
                  aria-label="Remove"
                >&times;</button>
                <Image src={image} alt={title} width={48} height={64} className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight truncate">{title}</div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{mediaType}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  // default grid version
  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-4 text-center">In Love With</h2>
      <div className="flex flex-wrap justify-center gap-4">
        {items.map((item) => {
          const id = getId(item) ?? undefined;
          const title = getTitle(item);
          const image = getImageUrl(item) ?? 'https://placehold.co/200x300';
          const mediaType = getMediaType(item) ?? '';
          return (
            <div key={`${id}_${mediaType}`} className="bg-gray-800 rounded-lg p-4 flex flex-col items-center w-40 relative">
              <button
                className="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-lg"
                onClick={() => onRemove(id ?? '')}
                aria-label="Remove"
              >&times;</button>
              <Image src={image} alt={title} width={80} height={128} className="w-20 h-32 object-cover rounded mb-2" />
              <div className="font-semibold text-center">{title}</div>
              <div className="text-xs text-gray-400 mt-1">{mediaType}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
