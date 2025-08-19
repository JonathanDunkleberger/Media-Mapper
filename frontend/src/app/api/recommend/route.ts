import { NextRequest, NextResponse } from 'next/server';

// POST /api/recommend
export async function POST(req: NextRequest) {
  try {
    const { favorites } = await req.json();
    return NextResponse.json({ recommendations: favorites });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
