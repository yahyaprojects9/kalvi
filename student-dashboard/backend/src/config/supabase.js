import { createClient } from "@supabase/supabase-js";
import { assertRealSupabaseCredentials, enableLocalTlsFallback, env } from "./env.js";

let supabase;

export function getSupabase() {
  assertRealSupabaseCredentials();

  if (!supabase) {
    enableLocalTlsFallback();
    supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabase;
}
