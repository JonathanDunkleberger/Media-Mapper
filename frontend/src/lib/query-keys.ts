export const keys = {
  popular: (cat: string, mode: string) => ['popular', cat, mode] as const,
  popularPage: (cat: string, mode: string, page: number) => ['popular', cat, mode, page] as const,
  favorites: () => ['favorites'] as const,
  details: (cat: string, id: number | string) => ['details', cat, id] as const,
  recommend: (cat: string, id: number | string) => ['recommend', cat, id] as const,
  search: (q: string, cat?: string) => ['search', q, cat ?? 'all'] as const,
};
