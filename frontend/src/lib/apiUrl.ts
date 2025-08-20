// src/lib/apiUrl.ts
export function apiUrl(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}
