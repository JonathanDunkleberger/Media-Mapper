import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    has_V4: !!process.env.TMDB_V4_TOKEN,
    has_V3: !!process.env.TMDB_API_KEY,
  });
}
