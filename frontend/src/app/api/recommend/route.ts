import { NextResponse } from 'next/server';
import type { MediaItem, MediaType } from '@/lib/types';
import { computeRecommendations } from '@/lib/recs';
import { createSupabaseServer } from '@/lib/supabase-server';

export const revalidate = 0; // always fresh

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    const u = new URL(req.url);
    const cat = (u.searchParams.get('cat') as MediaType | null) ?? null;

    let favorites: MediaItem[] = [];
    let favoritesHash = 'anon';
    if (user) {
      // pull favorites first
      const favRes = await supabase
        .from('favorites')
        .select('media_type, external_id, title, poster_url, year, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (favRes.data) {
        type Row = { media_type: string; external_id: string; title: string; poster_url: string | null; year: number | null };
        favorites = (favRes.data as Row[]).map(r => ({
          id: r.external_id,
          type: r.media_type as MediaType,
          title: r.title,
          posterUrl: r.poster_url,
          year: r.year ?? null,
          sublabel: r.media_type.toUpperCase() + (r.year ? ` • ${r.year}` : ''),
        }));
        // stable order hash
        const key = favorites.map(f => `${f.type}:${f.id}`).sort().join('|');
        // simple hash
        favoritesHash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))).toString('hex').slice(0,32);
      }
    }

    let recs: MediaItem[] = [];
    const TTL_MS = 5 * 60 * 1000; // 5 minutes
    if (user) {
      const now = Date.now();
      // check cache
      const { data: cacheRows } = await supabase
        .from('user_recs_cache')
        .select('results_json, favorites_hash, updated_at')
        .eq('user_id', user.id)
        .eq('favorites_hash', favoritesHash)
        .maybeSingle();
      if (cacheRows) {
        const updatedAt = new Date(cacheRows.updated_at).getTime();
        if (now - updatedAt < TTL_MS) {
          try {
            const parsed = JSON.parse(cacheRows.results_json) as MediaItem[];
            recs = parsed;
          } catch {}
        }
      }
    }

    if (!recs.length) {
      recs = await computeRecommendations(favorites);
      if (user) {
        await supabase.from('user_recs_cache').upsert({
          user_id: user.id,
          favorites_hash: favoritesHash,
          results_json: JSON.stringify(recs),
        }).select();
      }
    }

    const filtered = cat ? recs.filter(r => r.type === cat) : recs;
    return NextResponse.json({ results: filtered });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
