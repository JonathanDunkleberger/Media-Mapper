// src/lib/apiUrl.ts
export function apiUrl(path: string) {
  if (!path) return "/";
  if (/^https?:\/\//i.test(path)) return path;  // keep true externals
  return path.startsWith("/") ? path : `/${path}`;
}
