// store/authStore.ts
import { create } from "zustand";
import { dbg } from "../lib/debug";
import { fetchClinicApproval } from "../lib/admin/clinicApproval";
import { supabase } from "../lib/supabase";
import { AuthUser, Sex, UserRole } from "../types";

//Web auth landing pages (Vercel)
const VERIFIED_REDIRECT = "https://lumenai-vert.vercel.app/auth/verified";
const RESET_REDIRECT    = "https://lumenai-vert.vercel.app/auth/reset-password";

//Compose the DB's generated full_name for the JWT-bootstrap fast path
const composeFullName = (first?: string, middle?: string | null, last?: string) =>
  [first, middle, last].filter(Boolean).join(" ").trim();

//Body shape sent to the clinic-signup Edge Function
export interface ClinicSignupPayload {
  email: string;
  password: string;
  facility_name: string;
  facility_type: string;
  doh_lto_number: string;
  region_code: string;
  province_code?: string | null;
  city_code: string;
  barangay_code: string;
  address_line?: string;
  zip_code?: string;
  phone: string;          //11 digits
  website?: string;
  contact_first_name: string;
  contact_middle_name?: string;
  contact_last_name: string;
  contact_mobile: string; //11 digits
  contact_email: string;
}

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
  registerPatient: (params: {
    email: string;
    password: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    sex: Sex;
    dateOfBirth: string;     //YYYY-MM-DD
    contactNumber: string;
  }) => Promise<{ success: boolean; needsConfirmation?: boolean; error?: string }>;
  registerClinic: (params: ClinicSignupPayload) =>
    Promise<{ success: boolean; clinic_code?: string; error?: string }>;
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
        first_name: meta.first_name ?? "",
        middle_name: meta.middle_name ?? null,
        last_name: meta.last_name ?? "",
        full_name: composeFullName(meta.first_name, meta.middle_name, meta.last_name),
        role: meta.role as UserRole,
        clinic_id: meta.clinic_id ?? null,
        is_active: true,
      };
      dbg("authStore", `${event} — user from JWT, role=${user.role}`);
      set({ user, initialized: true });

      //clinic_id is set on the profiles row (by the clinic-signup edge function),
      //not in user_metadata. Fetch the profile to enrich on cold start.
      //patient_code lives on profiles too — same fetch fixes that for free.
      if (user.role === "clinic" && !user.clinic_id) {
        supabase.from("profiles").select("*").eq("id", session.user.id).single()
          .then(({ data }) => {
            if (data) {
              set({ user: data as AuthUser });
              dbg("authStore", `${event} — profile enriched, clinic_id=${(data as AuthUser).clinic_id}`);
            }
          });
      } else if (user.role === "patient" && !user.patient_code) {
        supabase.from("profiles").select("*").eq("id", session.user.id).single()
          .then(({ data }) => {
            if (data) set({ user: data as AuthUser });
          });
      }
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

        //Admin login is web-only; reject on mobile.
        if (profile.role === "admin") {
          await supabase.auth.signOut();
          const err = "Admin login is not available on mobile. Use the admin web app.";
          set({ user: null, isLoading: false, error: err });
          return { success: false, error: err };
        }

        // Clinic accounts must be approved by an admin before they can
        // log in. Clinics use fabricated emails so Supabase email
        // verification doesn't establish trust — the admin manually
        // verifies the DOH LTO and flips approval_status to 'approved'
        // on the web console. See migration 20260508 + the
        // `admin_approve_clinic` / `admin_reject_clinic` RPCs.
        if (profile.role === "clinic") {
          let clinic;
          try {
            clinic = await fetchClinicApproval(profile.id);
          } catch (e: any) {
            await supabase.auth.signOut();
            const err = e?.message ?? "Could not verify clinic approval status.";
            set({ user: null, isLoading: false, error: err });
            return { success: false, error: err };
          }
          if (clinic && clinic.approval_status !== "approved") {
            await supabase.auth.signOut();
            const err = clinic.approval_status === "rejected"
              ? `Your clinic registration was rejected${clinic.rejection_reason ? ": " + clinic.rejection_reason : "."}`
              : "Your clinic account is awaiting admin approval. We'll let you in once your DOH LTO is verified.";
            set({ user: null, isLoading: false, error: err });
            return { success: false, error: err };
          }
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

    registerPatient: async ({
      email, password, firstName, middleName, lastName,
      sex, dateOfBirth, contactNumber,
    }) => {
      set({ isLoading: true, error: null });
      try {
        //handle_new_user() trigger reads these from raw_user_meta_data and
        //creates the profiles row with role=patient + auto-generated patient_code.
        const metadata: Record<string, string> = {
          role: "patient",
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          sex,
          date_of_birth: dateOfBirth,
          contact_number: contactNumber.trim(),
        };
        if (middleName?.trim()) metadata.middle_name = middleName.trim();

        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: metadata,
            emailRedirectTo: VERIFIED_REDIRECT,
          },
        });
        if (error) throw error;

        //Email confirmation required — session is null until user clicks the link.
        //AUTH-16: Supabase returns identities: [] (not an error) for duplicate emails
        //when confirmations are enabled.
        if ((data.user?.identities?.length ?? 1) === 0) {
          const err = "An account with this email already exists. Please sign in instead.";
          set({ isLoading: false, error: err });
          return { success: false, error: err };
        }
        set({ isLoading: false });
        return { success: true, needsConfirmation: true };
      } catch (e: any) {
        const err = mapAuthError(e);
        set({ isLoading: false, error: err });
        return { success: false, error: err };
      }
    },

    registerClinic: async (params: ClinicSignupPayload) => {
      set({ isLoading: true, error: null });
      try {
        //1. Call the edge function (verify_jwt=false; uses anon key for transport).
        const { data, error } = await supabase.functions.invoke("clinic-signup", {
          body: params,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.success) throw new Error("Clinic signup failed");

        //2. We deliberately do NOT auto-sign-in. New clinic accounts ship
        //   with `clinics.approval_status = 'pending'` and the login gate
        //   will reject them until an admin approves on the web console.
        //   The register screen routes to the pending-approval confirmation
        //   instead of the clinic dashboard.
        set({ isLoading: false, error: null });
        return { success: true, clinic_code: data.clinic_code as string | undefined };
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
          { redirectTo: RESET_REDIRECT },
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
