import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
  has_V4: !!env.TMDB_V4_TOKEN,
  has_V3: !!env.TMDB_API_KEY,
  });
}
