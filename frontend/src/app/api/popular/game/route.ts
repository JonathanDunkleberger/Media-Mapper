// Alias route: /api/popular/game -> /api/popular/games
// Re-export handlers to satisfy singular category usage.
export { GET, revalidate } from '../games/route';
