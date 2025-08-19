import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Not available' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { has_V4: !!env.TMDB_V4_TOKEN, has_V3: !!env.TMDB_API_KEY } });
}
