import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * The one Supabase client for the whole app. Browser-safe by design:
 * it only ever uses the publishable key, and every permission is enforced by Postgres RLS.
 * It is null when the env vars are missing, so the public site can fall back to site.ts.
 */
export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // We use email + password only, so there are no magic or OAuth links to parse.
          detectSessionInUrl: false,
        },
      })
    : null

export const isSupabaseConfigured = supabase !== null