import { NextResponse } from 'next/server';
import { env } from '@/lib/env.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
    env: {
      TMDB_API_KEY: !!env.TMDB_API_KEY,
      TMDB_V4_TOKEN: !!env.TMDB_V4_TOKEN,
      IGDB_CLIENT_ID: !!env.TWITCH_CLIENT_ID,
      IGDB_SECRET: !!env.TWITCH_CLIENT_SECRET,
      GOOGLE_BOOKS_API_KEY: !!env.GOOGLE_BOOKS_API_KEY,
      // SUPABASE_URL and SUPABASE_KEY may be in a different env module if used
    }
  });
}
