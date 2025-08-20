// Client-side environment validation: ONLY expose NEXT_PUBLIC_* vars.
import { z } from 'zod';

const isBuild = typeof window === 'undefined' && (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === undefined);
const isTest = process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_ALGOLIA_APP_ID: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: z.string().optional(),
  NEXT_PUBLIC_BASE_URL: z.string().optional(),
  // Optional explicit API base; if present we will call this host instead of same-origin relative /api routes.
  NEXT_PUBLIC_API_BASE: z.string().url().optional(),
  NEXT_PUBLIC_API_KEY: z.string().optional(),
});

// Lazy validation - only validate when first accessed, not at import time
let _env: z.infer<typeof ClientEnvSchema> | null = null;
let _validationAttempted = false;

export const env = new Proxy({} as z.infer<typeof ClientEnvSchema>, {
  get(target, prop: string) {
    if (!_validationAttempted) {
      _validationAttempted = true;
      try {
        _env = ClientEnvSchema.parse({
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          NEXT_PUBLIC_ALGOLIA_APP_ID: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
          NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY,
          NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
          NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
          NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY,
        });
      } catch (error) {
        // During build time or test, environment variables might not be available
        if (isBuild || isTest) {
          console.warn('Client environment validation skipped during build/test');
          _env = {} as z.infer<typeof ClientEnvSchema>;
        } else {
          throw error;
        }
      }
    }
    return _env?.[prop as keyof typeof _env];
  }
});

export type ClientEnv = z.infer<typeof ClientEnvSchema>;
