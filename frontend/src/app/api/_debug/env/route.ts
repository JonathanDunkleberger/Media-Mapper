import { NextResponse } from 'next/server';
import { env } from '@/lib/env.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runtime = (typeof (globalThis as any).EdgeRuntime !== 'undefined') ? 'edge' : 'node';
  return NextResponse.json({
    ok: true,
    hasTMDBv4: !!env.TMDB_V4_TOKEN,
    hasTMDBv3: !!env.TMDB_API_KEY,
    runtime,
  });
}
