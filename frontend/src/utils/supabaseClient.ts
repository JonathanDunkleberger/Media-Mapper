import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env.client';

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
);
