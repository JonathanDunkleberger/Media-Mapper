// DEPRECATED: use helpers in images.ts instead (tmdbPosterUrl, tileImageFromDetail, etc.)
// This shim remains temporarily to avoid breaking any out-of-repo dynamic imports; scheduled for removal.
import { tmdbPosterUrl } from './images';
export function safePosterUrl(path?: string | null, size: 'w185' | 'w300' | 'w500' = 'w300'): string | null {
  return tmdbPosterUrl(path, size);
}
