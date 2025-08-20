import { describe, it, expect } from 'vitest';
import { middleware } from '@/middleware';

describe('middleware', () => {
  it('adds x-request-id', async () => {
    // Minimal mock compatible with NextRequest where only url matters for our middleware
    const req = new Request('http://t/any') as any;
    const res = middleware(req as any);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});
