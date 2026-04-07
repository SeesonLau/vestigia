// store/authStore.ts
import { create } from "zustand";
import { dbg } from "../lib/debug";
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
    return "An account with this email already exists. Please sign in instead.";
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
  initialized: boolean;
  isLoading: boolean;
  error: string | null;

  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    clinicName?: string,
  ) => Promise<{ success: boolean; needsConfirmation?: boolean; role?: UserRole; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // AUTH-13: Clean up any existing listener before registering (guards against HMR double-subscribe)
  _authSubscription?.unsubscribe();
  dbg("authStore", "registering onAuthStateChange");
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    dbg("authStore", `onAuthStateChange — event=${event} session=${session ? "found" : "null"}`);
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
      // Use JWT metadata — no DB round-trip.
      // For SIGNED_IN (interactive login), the login() action already set the
      // full profile row; only apply JWT fallback when store has no user yet.
      const existing = get().user;
      if (existing?.id === session.user.id) {
        dbg("authStore", `${event} — profile already set by login(), skipping`);
        set({ initialized: true });
        return;
      }
      const meta = session.user.user_metadata ?? {};
      const user: AuthUser = {
        id: session.user.id,
        email: session.user.email ?? "",
        full_name: meta.full_name ?? "",
        role: meta.role as UserRole,
        clinic_id: meta.clinic_id,
        is_active: true,
      };
      dbg("authStore", `${event} — user from JWT, role=${user.role}`);
      set({ user, initialized: true });
    } else if (event === "INITIAL_SESSION" && !session) {
      dbg("authStore", "INITIAL_SESSION — no session");
      set({ initialized: true });
    } else if (event === "SIGNED_OUT") {
      set({ user: null, initialized: true });
    }
  });
  _authSubscription = subscription;

  return {
    user: null,
    initialized: false,
    isLoading: false,
    error: null,

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
        dbg("login", "calling signInWithPassword");
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });
        dbg("login", `signInWithPassword done — error=${error?.message ?? "none"}`);
        if (error) throw error;

        dbg("login", "fetching profile");
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
        dbg("login", `profile fetch done — error=${profileError?.message ?? "none"}`);
        if (profileError) throw profileError;

        const profile = profileData as AuthUser;

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
      clinicName?: string,
    ) => {
      set({ isLoading: true, error: null });
      try {
        // handle_new_user() trigger reads these to create the profile row.
        // For clinic role, clinic_name is used by the trigger to create a new
        // clinic record and assign its id to the profile automatically.
        const metadata: Record<string, string> = { full_name: fullName, role };
        if (role === "clinic" && clinicName) metadata.clinic_name = clinicName;

        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: metadata,
            emailRedirectTo: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auth-redirect`,
          },
        });
        if (error) throw error;

        // Email confirmation required — session is null until user clicks link
        if (!data.session) {
          // AUTH-16: When email confirmation is enabled, Supabase silently returns
          // identities: [] instead of a user_already_exists error for duplicate emails.
          if ((data.user?.identities?.length ?? 1) === 0) {
            const err = "An account with this email already exists. Please sign in instead.";
            set({ isLoading: false, error: err });
            return { success: false, error: err };
          }
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

        const profile = profileData as AuthUser;
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
        set({ user: null, error: null });
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

    clearError: () => set({ error: null }),
  };
});
