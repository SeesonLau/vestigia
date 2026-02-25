// store/authStore.ts
//
// Auth state management using Zustand.
//
// LOGIN LOGIC:
//   1. Check MOCK_ACCOUNTS first (dev accounts — always works, no network needed)
//   2. If email not in MOCK_ACCOUNTS → fall through to Supabase (TODO when integrating)
//
// This means mock and real accounts coexist without conflict.

import { create } from "zustand";
import { MOCK_ACCOUNTS, MOCK_PROFILES } from "../data/mockData";
import { AuthUser, UserRole } from "../types";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;

  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

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

    // ── Step 2: TODO — Supabase auth (real accounts) ─────────────
    // When integrating Supabase, replace this block:
    //
    // try {
    //   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    //   if (error) throw error;
    //   const { data: profile } = await supabase
    //     .from('profiles').select('*').eq('id', data.user.id).single();
    //   set({ user: profile, isLoading: false });
    //   return { success: true, role: profile.role };
    // } catch (e: any) {
    //   set({ isLoading: false, error: e.message });
    //   return { success: false, error: e.message };
    // }

    const err = "No account found with that email address.";
    set({ isLoading: false, error: err });
    return { success: false, error: err };
  },

  logout: () => {
    // TODO: supabase.auth.signOut() when integrating
    set({ user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
