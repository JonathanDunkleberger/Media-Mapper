// DEPRECATED shim for legacy imports. Use hooks directly: '@/hooks/useFavorites'
import { useFavorites, useFavoritesSet, useToggleFavorite } from '@/hooks/useFavorites';
/** @deprecated Import from '@/hooks/useFavorites' instead. */
export { useFavorites, useFavoritesSet, useToggleFavorite };
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn('[deprecated] import from "@/hooks/useFavorites" instead of "@/store/favorites"');
}
