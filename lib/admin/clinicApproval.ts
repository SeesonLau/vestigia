// lib/admin/clinicApproval.ts
// Typed wrappers for the admin-gated workflows added in
// 20260508_admin_gating_and_tickets.sql:
//
//   1. Clinic approval gate (clinics.approval_status)
//   2. Clinic password-reset queue (admin-mediated since clinics use
//      fabricated emails that can't receive Supabase reset mail)
//
// All RPCs run SECURITY DEFINER server-side and check the caller's role
// internally, so the client just calls and surfaces errors.

import { supabase } from "../supabase";

export type ClinicApprovalStatus = "pending" | "approved" | "rejected";

export interface ClinicApprovalRow {
  id: string;
  approval_status: ClinicApprovalStatus;
  rejection_reason: string | null;
}

/**
 * Fetch the approval state of the clinic owned by the given profile id.
 * Used by the auth store to decide whether to let the clinic in after
 * a successful Supabase password sign-in.
 */
export async function fetchClinicApproval(profileId: string): Promise<ClinicApprovalRow | null> {
  const { data, error } = await supabase
    .from("clinics")
    .select("id, approval_status, rejection_reason")
    .eq("owner_profile_id", profileId)
    .maybeSingle();
  if (error) {
    // RLS allows anyone authenticated to read clinics, so the only way
    // we land here is a real network / DB problem. Surface it.
    throw new Error(`Could not load clinic approval status: ${error.message}`);
  }
  return data as ClinicApprovalRow | null;
}

/**
 * Clinic-side: file a password-reset request. The admin reviews it on
 * the web console, contacts the clinic out-of-band to verify identity,
 * and then sets a new password via the `admin-set-clinic-password`
 * Edge Function. Mobile just files the request and shows a "we'll
 * contact you" confirmation.
 */
export async function submitPasswordResetRequest(notes?: string): Promise<string> {
  const { data, error } = await supabase.rpc("submit_password_reset_request", {
    p_notes: notes ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
