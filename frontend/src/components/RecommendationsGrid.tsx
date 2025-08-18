import React from 'react';
import { MediaCard } from './MediaCard';
import type { KnownMedia } from '../types/media';

export function RecommendationsGrid({ items }: { items: KnownMedia[] }) {
  if (!items.length) return null;
  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Recommended For You</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item, idx) => (
          <MediaCard key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}
