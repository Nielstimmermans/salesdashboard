import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singletons — only created on first use, not at import/build time

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

/** Client-side Supabase client (uses anon key, respects RLS) */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabase) {
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return Reflect.get(_supabase, prop);
  },
});

/** Server-side Supabase client (uses service role key, bypasses RLS) */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return Reflect.get(_supabaseAdmin, prop);
  },
});
