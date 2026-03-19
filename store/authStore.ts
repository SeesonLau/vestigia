// store/authStore.ts
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { AuthUser, UserRole } from "../types";

// ── Error message mapping ────────────────────────────────────────
function mapAuthError(error: { message?: string; code?: string; status?: number } | null): string {
  if (!error) return "An unexpected error occurred";
  const code = (error as any).code ?? "";
  const status = (error as any).status ?? 0;
  const msg = (error.message ?? "").toLowerCase();

  // Network / server errors
  if (
    status === 504 || status === 503 || status === 502 ||
    msg.includes("fetch") || msg.includes("network") ||
    msg.includes("timeout") || msg.includes("failed to fetch")
  ) return "Connection problem. Check your internet and try again.";

  // Auth-specific errors
  if (code === "invalid_credentials" || msg.includes("invalid login"))
    return "Incorrect email or password";
  if (code === "user_already_exists" || msg.includes("already registered"))
    return "An account with this email already exists";
  if (code === "weak_password" || msg.includes("weak password"))
    return "Password is too weak";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "Please confirm your email before signing in";
  if (code === "over_email_send_rate_limit" || msg.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";

  // AUTH-15: Profile row missing (PostgREST PGRST116 — no rows returned from .single())
  if (code === "PGRST116" || msg.includes("json object requested") || msg.includes("no rows returned"))
    return "Account setup is incomplete. Please try again or contact support.";

  return error.message || "Something went wrong. Please try again.";
}

// AUTH-06: Module-level rate-limit state (resets on app restart — intentional)
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 30_000; // 30 seconds
let _loginAttempts = 0;
let _loginLockedUntil = 0;

// AUTH-13: Module-level subscription reference so it can be cleaned up on HMR
let _authSubscription: { unsubscribe: () => void } | null = null;

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  pendingClinicId: string | null;

  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    clinicId?: string,
  ) => Promise<{ success: boolean; needsConfirmation?: boolean; role?: UserRole; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  restoreSession: () => Promise<UserRole | null>;
  clearError: () => void;
  setPendingClinicId: (id: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // AUTH-13: Clean up any existing listener before registering (guards against HMR double-subscribe)
  _authSubscription?.unsubscribe();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        set({ user: profile as AuthUser });
      }
    } else if (event === "SIGNED_OUT") {
      set({ user: null });
    }
  });
  _authSubscription = subscription;

  return {
    user: null,
    isLoading: false,
    error: null,
    pendingClinicId: null,

    login: async (email: string, password: string) => {
      // AUTH-06: Enforce client-side lockout before hitting Supabase
      const now = Date.now();
      if (now < _loginLockedUntil) {
        const secs = Math.ceil((_loginLockedUntil - now) / 1000);
        const err = `Too many failed attempts. Try again in ${secs}s.`;
        set({ error: err });
        return { success: false, error: err };
      }

      set({ isLoading: true, error: null });
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });
        if (error) throw error;

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
        if (profileError) throw profileError;

        let profile = profileData as AuthUser;

        //Apply pending clinic_id if set during registration (email confirmation flow)
        const { pendingClinicId } = get();
        if (profile.role === "clinic" && !profile.clinic_id && pendingClinicId) {
          await supabase
            .from("profiles")
            .update({ clinic_id: pendingClinicId })
            .eq("id", profile.id);
          profile = { ...profile, clinic_id: pendingClinicId };
          set({ pendingClinicId: null });
        }

        // AUTH-06: Reset counter on success
        _loginAttempts = 0;
        _loginLockedUntil = 0;

        set({ user: profile, isLoading: false, error: null });
        return { success: true, role: profile.role };
      } catch (e: any) {
        // AUTH-06: Increment failure counter; lock out after max attempts
        _loginAttempts++;
        if (_loginAttempts >= LOGIN_MAX_ATTEMPTS) {
          _loginLockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
          _loginAttempts = 0;
        }
        const err = mapAuthError(e);
        set({ isLoading: false, error: err });
        return { success: false, error: err };
      }
    },

    register: async (
      email: string,
      password: string,
      fullName: string,
      role: UserRole,
      clinicId?: string,
    ) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            // handle_new_user() trigger reads these to create the profile row
            data: { full_name: fullName, role },
            // Routes through the Edge Function redirect page first.
            // On mobile it opens the app; on desktop it shows a "use your phone" message.
            emailRedirectTo: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auth-redirect`,
          },
        });
        if (error) throw error;

        // Email confirmation required — session is null until user clicks link
        if (!data.session) {
          // AUTH-14: Only store clinicId when the registering role is actually clinic
          if (role === "clinic" && clinicId) set({ pendingClinicId: clinicId });
          set({ isLoading: false });
          return { success: true, needsConfirmation: true };
        }

        // Email confirmation disabled — session available immediately
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user!.id)
          .single();
        if (profileError) throw profileError;

        let profile = profileData as AuthUser;

        if (profile.role === "clinic" && clinicId) {
          await supabase
            .from("profiles")
            .update({ clinic_id: clinicId })
            .eq("id", profile.id);
          profile = { ...profile, clinic_id: clinicId };
        }

        set({ user: profile, isLoading: false, error: null });
        return { success: true, role: profile.role };
      } catch (e: any) {
        const err = mapAuthError(e);
        set({ isLoading: false, error: err });
        return { success: false, error: err };
      }
    },

    logout: async () => {
      // AUTH-14: Always clear local state even if server-side signOut fails
      try {
        await supabase.auth.signOut();
      } finally {
        set({ user: null, error: null, pendingClinicId: null });
      }
    },

    forgotPassword: async (email: string) => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.toLowerCase().trim(),
          { redirectTo: 'vestigia://update-password' },
        );
        if (error) throw error;
        return { success: true };
      } catch (e: any) {
        return { success: false, error: mapAuthError(e) };
      }
    },

    restoreSession: async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (error || !profile) return null;

        set({ user: profile as AuthUser });
        return (profile as AuthUser).role;
      } catch {
        return null;
      }
    },

    clearError: () => set({ error: null }),

    setPendingClinicId: (id: string | null) => set({ pendingClinicId: id }),
  };
});
