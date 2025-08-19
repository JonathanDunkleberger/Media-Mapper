import MediaRowCarousel from './MediaRowCarousel';
import type { MediaItem } from '@/lib/types';

export function RowSection({ title, items }: { title: string; items: MediaItem[] }) {
  if (!items.length) return null;
  return <MediaRowCarousel title={title} items={items} />;
}
