import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseServer() {
  return createServerComponentClient({ cookies });
}
