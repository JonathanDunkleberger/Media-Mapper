export async function mustOk<T>(res: Response): Promise<T> {
  const j: any = await res.json().catch(() => null);
  if (!j?.ok) throw new Error(j?.error ?? `Bad response (${res.status})`);
  return j.data as T;
}
