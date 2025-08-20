import { apiGet, apiPost, apiDelete } from '@/lib/api/client';

// Generic wrappers used by hooks (throw on error for react-query)
export async function qGet<T>(path: string, query?: Record<string, any>) {
  const r = await apiGet<T>(path, { query });
  if (!r.ok) throw new Error(r.error);
  return r.data as T;
}
export async function qPost<T>(path: string, body: any, query?: Record<string, any>) {
  const r = await apiPost<T>(path, body, { query });
  if (!r.ok) throw new Error(r.error);
  return r.data as T;
}
export async function qDelete<T>(path: string, query?: Record<string, any>) {
  const r = await apiDelete<T>(path, { query });
  if (!r.ok) throw new Error(r.error);
  return r.data as T;
}

export async function qPopular<T>(cat: string, mode: string, page: number, take = 60) {
  const r = await apiGet<T>(`/api/popular/${cat}`, { query: { mode, page, take } });
  if (!r.ok) throw new Error(r.error);
  return r.data as T;
}

export async function qFavoritesList<T>() {
  const r = await apiGet<T>('/api/favorites');
  if (!r.ok) throw new Error(r.error);
  return r.data as T;
}

export async function qFavoriteUpsert(payload: { id: number; category: string; title: string; poster?: string }) {
  const r = await apiPost<{ id: number }>(`/api/favorites`, payload);
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

export async function qFavoriteDelete(id: number) {
  const r = await apiDelete<{ id: number }>(`/api/favorites`, { query: { id } });
  if (!r.ok) throw new Error(r.error);
  return r.data;
}
