import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/favorites
export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase.from('favorites').select('*');
    if (error) throw error;
    return NextResponse.json({ favorites: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/favorites
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = await supabase.from('favorites').insert([body]);
    if (error) throw error;
    return NextResponse.json({ success: true, favorite: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
