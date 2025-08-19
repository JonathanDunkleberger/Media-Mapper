import { safePosterUrl } from './image';
import type { MediaItem } from '@/components/MediaTile';

type TMDBMovie = { id: number; title?: string; name?: string; poster_path?: string | null; release_date?: string | null };

export function mapMoviesToItems(list: TMDBMovie[]): MediaItem[] {
  return list.map(m => ({
    id: m.id,
    type: 'movie',
    title: m.title ?? m.name ?? 'Untitled',
    year: m.release_date ? new Date(m.release_date).getFullYear() : null,
    posterUrl: safePosterUrl(m.poster_path, 'w300')
  }));
}
