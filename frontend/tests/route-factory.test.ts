import { describe, it, expect } from 'vitest';
import { createJsonRoute } from '@/lib/api/route-factory';
import { z } from 'zod';

const Q = z.object({ x: z.coerce.number().min(1) });

describe('route-factory', () => {
  const GET = createJsonRoute({
    schema: Q,
    async run({ query }) { return { got: (query as any).x }; },
  });

  it('returns ok true', async () => {
    const res = await GET(new Request('http://t/api/test?x=2'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.got).toBe(2);
  });

  it('zod errors -> 400', async () => {
    const res = await GET(new Request('http://t/api/test?x=0'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
