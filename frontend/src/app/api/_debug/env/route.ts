import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Using env.NODE_ENV is not available; rely on build-time process substitution is banned, so expose a debug flag via TMDB tokens only.
  return NextResponse.json({ ok: true, data: { has_V4: !!env.TMDB_V4_TOKEN } });
}
