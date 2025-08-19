import type { MediaItem, MediaType } from '@/lib/types';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createJsonRoute } from '@/lib/api/route-factory';
import { z } from 'zod';

export const runtime = 'nodejs';

const Upsert = z.object({
  action: z.enum(['add','remove']),
  id: z.union([z.string(), z.number()]),
  type: z.enum(['movie','tv','game','book','anime']).optional(),
  title: z.string().optional(),
  posterUrl: z.string().url().nullable().optional(),
  year: z.union([z.number().int(), z.null()]).optional(),
});

export const GET = createJsonRoute({
  cacheSeconds: 0,
  async run() {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('favorites')
      .select('media_type, external_id, title, poster_url, year')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    type Row = { media_type: string; external_id: string; title: string; poster_url: string | null; year: number | null };
    return (data as Row[] | null ?? []).map(r => ({
      id: r.external_id,
      type: r.media_type as MediaType,
      title: r.title,
      posterUrl: r.poster_url,
      year: r.year ?? null,
      sublabel: (r.media_type && typeof r.media_type === 'string' ? r.media_type.toUpperCase() : 'MEDIA') + (r.year ? ` • ${r.year}` : ''),
    }));
  }
});

export const POST = async (req: Request) => createJsonRoute({
  schema: Upsert,
  cacheSeconds: 0,
  async run({ query }) {
    const { action, id, type, title, posterUrl, year } = query as any;
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw Object.assign(new Error('unauthorized'), { status: 401 });
    if (action === 'add') {
      const payload = {
        user_id: user.id,
        media_type: type as MediaType,
        external_id: String(id),
        title,
        poster_url: posterUrl ?? null,
        year: year ?? null,
      };
      const { error } = await supabase.from('favorites').upsert(payload);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('favorites')
        .delete()
        .match({ user_id: user.id, media_type: type, external_id: String(id) });
      if (error) throw error;
    }
    try { await supabase.from('user_recs_cache').delete().eq('user_id', user.id); } catch {}
    return { id };
  }
})(req);
