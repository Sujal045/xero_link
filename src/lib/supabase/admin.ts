import { createClient } from '@supabase/supabase-js'

// Admin client uses service role key - bypasses RLS
// ONLY use this in server-side code (API routes, Server Actions)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
