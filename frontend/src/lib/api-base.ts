
// Deprecated: apiOrigin. Use apiUrl for all internal API calls.

// Normalize category singular/plural differences in one place.
const categoryMap: Record<string,string> = {
  movie: 'movies',
  tv: 'tv',
  game: 'games',
  games: 'games',
  book: 'books',
  books: 'books',
  anime: 'anime'
};
export function canonicalCategory(input: string): string {
  return categoryMap[input.toLowerCase()] || input.toLowerCase();
}

// Build an internal API path (no origin) starting with /api. Do not export raw '/api' usage elsewhere.
export function apiPath(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  return '/api' + path.replace(/^\/api/, '');
}

// Build full URL (may be relative if same-origin) combining origin + path.
export function apiUrl(path: string): string {
  return apiPath(path);
}
