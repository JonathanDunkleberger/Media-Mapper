// DEPRECATED shim for legacy imports. Use hooks directly: '@/hooks/useFavorites'
import { useFavorites, useFavoritesSet, useToggleFavorite } from '@/hooks/useFavorites';
/** @deprecated Import from '@/hooks/useFavorites' instead. */
export { useFavorites, useFavoritesSet, useToggleFavorite };
// Heuristic: if window exists we assume non-production for local warnings (no process.env access)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn('[deprecated] import from "@/hooks/useFavorites" instead of "@/store/favorites"');
}
