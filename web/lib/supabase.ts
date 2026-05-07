// web/lib/supabase.ts
// Browser-side Supabase client used by every admin page.
//
// We use the public anon key only — admin operations are gated server-side
// by the `is_admin()` SQL function inside SECURITY DEFINER RPCs (see the
// migrations 20260503140000_clinic_access_relationship.sql and
// 20260508_admin_gating_and_tickets.sql). Service-role-only flows (setting
// a clinic password) live in the `admin-set-clinic-password` Edge
// Function, never in the browser.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Surface the misconfiguration loudly during local dev. In production
  // these are baked at build time so the message above is what you'll
  // see in the browser console if the build was missing the vars.
  console.warn(
    "[web/lib/supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. " +
    "Copy .env.local.example to .env.local and fill in real values.",
  );
}

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Persist the JWT in localStorage so a hard refresh keeps the
      // admin signed in. The admin web is single-user-per-browser; the
      // session tail risk is acceptable.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "lumenai-admin-auth",
    },
  });
  return _client;
}
