// web/lib/auth.ts
// Tiny client-side auth helpers used by the admin layout / login page.
// Only admins are allowed past the gate — everything else gets bounced
// to /admin/login. We rely on Supabase's localStorage-persisted session
// (configured in lib/supabase.ts) so a hard refresh keeps the admin
// signed in.

"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";

export interface AdminSession {
  userId: string;
  email:  string;
  fullName: string;
}

type Status = "loading" | "signed-out" | "signed-in" | "not-admin";

interface UseAdminSessionResult {
  status: Status;
  session: AdminSession | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * React hook that resolves the admin session.
 *   status === "signed-in"  -> session is non-null and user is admin
 *   status === "not-admin"  -> a non-admin user is signed in (we sign them out)
 *   status === "signed-out" -> no Supabase session
 *   status === "loading"    -> initial fetch in flight
 */
export function useAdminSession(): UseAdminSessionResult {
  const [status, setStatus]   = useState<Status>("loading");
  const [session, setSession] = useState<AdminSession | null>(null);

  const refresh = async () => {
    const sb = getSupabase();
    const { data: sessRes } = await sb.auth.getSession();
    const sess = sessRes.session;
    if (!sess) {
      setStatus("signed-out");
      setSession(null);
      return;
    }

    // Resolve the role from the profiles table — the JWT's user_metadata
    // CAN carry role from signup but the canonical source of truth is
    // the profiles row (which is what RLS / is_admin() reads).
    const { data: profile, error } = await sb
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", sess.user.id)
      .single();

    if (error || !profile || profile.role !== "admin") {
      // Sign out so the next attempt starts clean.
      await sb.auth.signOut();
      setStatus("not-admin");
      setSession(null);
      return;
    }

    setStatus("signed-in");
    setSession({
      userId:   profile.id,
      email:    profile.email,
      fullName: profile.full_name ?? "Admin",
    });
  };

  useEffect(() => {
    void refresh();
    const sb = getSupabase();
    const { data: { subscription } } = sb.auth.onAuthStateChange(() => { void refresh(); });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await getSupabase().auth.signOut();
    setStatus("signed-out");
    setSession(null);
  };

  return { status, session, refresh, signOut };
}
