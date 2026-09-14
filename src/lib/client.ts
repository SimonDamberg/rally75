// Supabase client factory, shared by the browser singleton (supabase.ts) and Node scripts.
import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js'

export function createSupabase(
  url: string,
  key: string,
  options: SupabaseClientOptions<'public'> = {},
): SupabaseClient {
  return createClient(url, key, {
    ...options,
    // Guests are identified by {playerId, token}, not Supabase Auth.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
