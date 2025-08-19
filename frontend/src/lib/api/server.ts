import type { Api } from './types';

export async function apiGetServer<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { Accept: 'application/json', ...(init?.headers || {}) } });
  const json = (await res.json().catch(() => null)) as Api<T> | null;
  if (!json || json.ok !== true) throw new Error(json?.error ?? `Bad response (${res.status})`);
  return json.data;
}
