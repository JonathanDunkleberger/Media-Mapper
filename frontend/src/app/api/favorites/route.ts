import { NextResponse } from 'next/server';
import type { MediaItem, MediaType } from '@/lib/types';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });

  const { data, error } = await supabase
    .from('favorites')
    .select('media_type, external_id, title, poster_url, year')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = { media_type: string; external_id: string; title: string; poster_url: string | null; year: number | null };
  const items: MediaItem[] = (data as Row[] | null ?? []).map(r => ({
    id: r.external_id,
    type: r.media_type as MediaType,
    title: r.title,
    posterUrl: r.poster_url,
    year: r.year ?? null,
    sublabel: r.media_type.toUpperCase() + (r.year ? ` • ${r.year}` : ''),
  }));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { action, item } = (await req.json()) as { action: 'add'|'remove'; item: MediaItem };

  if (action === 'add') {
    const { error } = await supabase.from('favorites').upsert({
      user_id: user.id,
      media_type: item.type as MediaType,
      external_id: String(item.id),
      title: item.title,
      poster_url: item.posterUrl,
      year: item.year ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from('favorites')
      .delete()
      .match({ user_id: user.id, media_type: item.type, external_id: String(item.id) });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalidate cached recommendations for this user (best-effort)
  try {
    await supabase.from('user_recs_cache').delete().eq('user_id', user.id);
  } catch {}

  return NextResponse.json({ ok: true });
}
