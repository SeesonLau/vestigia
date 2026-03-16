// store/authStore.ts
//
// Auth state management using Zustand.
//
// LOGIN LOGIC:
//   1. Check MOCK_ACCOUNTS first (dev accounts — always works, no network needed)
//   2. If email not in MOCK_ACCOUNTS → fall through to Supabase (real accounts)
//
// This means mock and real accounts coexist without conflict.

import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { MOCK_ACCOUNTS, MOCK_PROFILES } from "../data/mockData";
import { AuthUser, UserRole } from "../types";

// ── Error message mapping ────────────────────────────────────────
function mapAuthError(error: { message?: string; code?: string } | null): string {
  if (!error) return "An unexpected error occurred";
  const code = (error as any).code ?? "";
  const msg = error.message ?? "";
  if (code === "invalid_credentials" || msg.toLowerCase().includes("invalid login"))
    return "Incorrect email or password";
  if (code === "user_already_exists" || msg.toLowerCase().includes("already registered"))
    return "An account with this email already exists";
  if (code === "weak_password" || msg.toLowerCase().includes("weak password"))
    return "Password is too weak";
  return msg || "An unexpected error occurred";
}

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
  // ── Auth state change listener ─────────────────────────────────
  supabase.auth.onAuthStateChange(async (event, session) => {
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

  return {
    user: null,
    isLoading: false,
    error: null,
    pendingClinicId: null,

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });

      // ── Step 1: Check mock/dev accounts ─────────────────────────
      const mockAccount = MOCK_ACCOUNTS[email.toLowerCase().trim()];
      if (mockAccount) {
        if (mockAccount.password === password) {
          const profile = MOCK_PROFILES[mockAccount.userId];
          set({ user: profile, isLoading: false, error: null });
          return { success: true, role: profile.role };
        } else {
          const err = "Incorrect password.";
          set({ isLoading: false, error: err });
          return { success: false, error: err };
        }
      }

      // ── Step 2: Supabase auth (real accounts) ────────────────────
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

        // Apply pending clinic_id if set during registration (email confirmation flow)
        const { pendingClinicId } = get();
        if (profile.role === "clinic" && !profile.clinic_id && pendingClinicId) {
          await supabase
            .from("profiles")
            .update({ clinic_id: pendingClinicId })
            .eq("id", profile.id);
          profile = { ...profile, clinic_id: pendingClinicId };
          set({ pendingClinicId: null });
        }

        set({ user: profile, isLoading: false, error: null });
        return { success: true, role: profile.role };
      } catch (e: any) {
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
          },
        });
        if (error) throw error;

        // Email confirmation required — session is null until user clicks link
        if (!data.session) {
          if (clinicId) set({ pendingClinicId: clinicId });
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
      await supabase.auth.signOut();
      set({ user: null, error: null, pendingClinicId: null });
    },

    forgotPassword: async (email: string) => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.toLowerCase().trim(),
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
