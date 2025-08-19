import { NextResponse } from 'next/server';
import { ZodSchema } from 'zod';

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; details?: string };
export type HandlerCtx<Q> = { query: Q };

type Cfg<Q> = {
  schema?: ZodSchema<Q>;
  cacheSeconds?: number; // s-maxage
  run: (ctx: HandlerCtx<Q>) => Promise<unknown>;
};

export function createJsonRoute<Q = Record<string, unknown>>(cfg: Cfg<Q>) {
  return async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const q = Object.fromEntries(url.searchParams.entries());
      const query = cfg.schema ? cfg.schema.parse(q) : (q as Q);
      const data = await cfg.run({ query });
      const headers = new Headers();
      if (cfg.cacheSeconds) {
        headers.set('Cache-Control', `public, s-maxage=${cfg.cacheSeconds}, stale-while-revalidate=60`);
      }
      return NextResponse.json({ ok: true, data } satisfies ApiOk<unknown>, { headers });
    } catch (err: any) {
      let message = 'Internal error';
      let status = 500;
      if (err?.name === 'ZodError') {
        message = 'Invalid request';
        status = 400;
      } else if (err?.status && typeof err.status === 'number') {
        status = err.status;
        message = err.message || `HTTP ${err.status}`;
      }
      // eslint-disable-next-line no-console
      console.error('[api]', req.url, err);
      return NextResponse.json(
        { ok: false, error: message, details: err?.body?.slice?.(0, 300) } satisfies ApiErr,
        { status }
      );
    }
  };
}
