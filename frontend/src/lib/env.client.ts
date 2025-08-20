// Client-side environment validation: ONLY expose NEXT_PUBLIC_* vars.
import { z } from 'zod';

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_ALGOLIA_APP_ID: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: z.string().optional(),
  // Removed NEXT_PUBLIC_BASE_URL and NEXT_PUBLIC_API_BASE: always use same-origin for internal API calls.
  NEXT_PUBLIC_API_KEY: z.string().optional(),
});

const parsed = ClientEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_ALGOLIA_APP_ID: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY,
  // Removed NEXT_PUBLIC_BASE_URL and NEXT_PUBLIC_API_BASE
  NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY,
});

export const envClient = parsed;
// Back-compat named export (deprecated)
export { parsed as env };

export type ClientEnv = typeof parsed;
