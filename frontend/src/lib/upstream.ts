export async function fetchJSON(
  url: string,
  init: RequestInit = {},
  label = "upstream"
) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 5000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    const txt = await res.text();
    // Try to parse JSON, but also return raw text for debugging.
    let json: any = null;
    try { json = JSON.parse(txt); } catch {}

    if (!res.ok) {
      return {
        ok: false,
        where: label,
        status: res.status,
        body: (txt || "").slice(0, 300),
      };
    }
    return { ok: true, data: json ?? txt };
  } catch (err: any) {
    return { ok: false, where: label, error: String(err?.message || err) };
  } finally {
    clearTimeout(to);
  }
}
