import { describe, it, expect } from 'vitest';
import { mustOk } from '@/lib/http/mustOk';

const ok = (data: any) => new Response(JSON.stringify({ ok: true, data }), { headers: { 'Content-Type': 'application/json' } });
const err = (error: string) => new Response(JSON.stringify({ ok: false, error }), { status: 500, headers: { 'Content-Type': 'application/json' } });

describe('mustOk', () => {
  it('returns data on ok', async () => {
    const res = await mustOk<{ a: number }>(ok({ a: 1 }));
    expect(res.a).toBe(1);
  });
  it('throws on error', async () => {
    await expect(mustOk(err('boom'))).rejects.toThrow('boom');
  });
});
