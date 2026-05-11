// web/lib/admin-rpc.ts
// Typed wrappers for the admin-side Supabase queries + RPCs.
//
// The mobile app has its own typed wrappers in lib/admin/* — kept
// separate because the shapes returned to admin (lists with full
// metadata) differ from what mobile consumes (own row, single value).

import { getSupabase } from "./supabase";

// ── Clinics ─────────────────────────────────────────────────────

export type ClinicApprovalStatus = "pending" | "approved" | "rejected";

export interface ClinicAdminRow {
  id: string;
  clinic_code: string;
  facility_name: string;
  facility_type: string;
  doh_lto_number: string;
  phone: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_mobile: string;
  contact_email: string;
  approval_status: ClinicApprovalStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  owner_profile_id: string;
}

export async function listClinics(filter: ClinicApprovalStatus | "all" = "all"): Promise<ClinicAdminRow[]> {
  let q = getSupabase()
    .from("clinics")
    .select(
      "id, clinic_code, facility_name, facility_type, doh_lto_number, phone, " +
      "contact_first_name, contact_last_name, contact_mobile, contact_email, " +
      "approval_status, rejection_reason, approved_at, created_at, owner_profile_id",
    )
    .order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("approval_status", filter);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ClinicAdminRow[];
}

export async function approveClinic(clinicId: string): Promise<void> {
  const { error } = await getSupabase().rpc("admin_approve_clinic", { p_clinic_id: clinicId });
  if (error) throw new Error(error.message);
}

export async function rejectClinic(clinicId: string, reason: string): Promise<void> {
  const { error } = await getSupabase().rpc("admin_reject_clinic", { p_clinic_id: clinicId, p_reason: reason });
  if (error) throw new Error(error.message);
}

// ── Password resets ─────────────────────────────────────────────

export type PasswordResetStatus = "pending" | "approved" | "rejected" | "expired";

export interface PasswordResetRow {
  id: string;
  clinic_profile_id: string;
  status: PasswordResetStatus;
  notes: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  // Joined from profiles + clinics for the admin UI.
  clinic_profile: {
    full_name: string;
    email: string;
  } | null;
  clinic: {
    facility_name: string;
    contact_mobile: string;
    clinic_code: string;
  } | null;
}

export async function listPasswordResets(filter: PasswordResetStatus | "all" = "pending"): Promise<PasswordResetRow[]> {
  // Two-step query because the joined `clinics` row sits one hop away
  // (via owner_profile_id == clinic_profile_id, not a true FK chain that
  // PostgREST can auto-traverse from clinic_password_reset_requests).
  let q = getSupabase()
    .from("clinic_password_reset_requests")
    .select(
      "id, clinic_profile_id, status, notes, reviewed_at, rejection_reason, created_at, " +
      "clinic_profile:profiles!clinic_password_reset_requests_clinic_profile_id_fkey ( full_name, email )",
    )
    .order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  // Hydrate the clinic info per row (1 batch query keyed by profile id).
  const rows = (data ?? []) as unknown as Omit<PasswordResetRow, "clinic">[];
  if (rows.length === 0) return [];
  const profileIds = Array.from(new Set(rows.map((r) => r.clinic_profile_id)));
  const { data: clinicData, error: clinicErr } = await getSupabase()
    .from("clinics")
    .select("owner_profile_id, facility_name, contact_mobile, clinic_code")
    .in("owner_profile_id", profileIds);
  if (clinicErr) throw new Error(clinicErr.message);
  const byOwner = new Map<string, { facility_name: string; contact_mobile: string; clinic_code: string }>();
  for (const c of (clinicData ?? []) as Array<{ owner_profile_id: string; facility_name: string; contact_mobile: string; clinic_code: string }>) {
    byOwner.set(c.owner_profile_id, {
      facility_name:  c.facility_name,
      contact_mobile: c.contact_mobile,
      clinic_code:    c.clinic_code,
    });
  }
  return rows.map((r) => ({ ...r, clinic: byOwner.get(r.clinic_profile_id) ?? null }));
}

/**
 * Set a clinic's password via the `admin-set-clinic-password` Edge
 * Function. Marks the reset request as approved on success.
 */
export async function adminSetClinicPassword(params: {
  requestId: string;
  profileId: string;
  newPassword: string;
}): Promise<void> {
  const { data: sess } = await getSupabase().auth.getSession();
  if (!sess.session) throw new Error("Not signed in.");
  const { error } = await getSupabase().functions.invoke("admin-set-clinic-password", {
    body: {
      request_id:    params.requestId,
      profile_id:    params.profileId,
      new_password:  params.newPassword,
    },
  });
  if (error) throw new Error(error.message);
}

// ── Support tickets ─────────────────────────────────────────────

export type TicketCategory =
  | "ui_ux"
  | "bug"
  | "performance"
  | "accessibility"
  | "security"
  | "navigation"
  | "auth"
  | "data_sync"
  | "hardware"
  | "question"
  | "code"
  | "database"
  | "thermal";

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  ui_ux:         "UI / UX",
  bug:           "Critical bug",
  performance:   "Performance",
  accessibility: "Accessibility",
  security:      "Security",
  navigation:    "Navigation",
  auth:          "Login / Authentication",
  data_sync:     "Data / Sync",
  hardware:      "Camera / Hardware",
  question:      "General question",
  code:          "Code quality",
  database:      "Database",
  thermal:       "Thermal pipeline",
};

export const ALL_TICKET_CATEGORIES: TicketCategory[] = [
  "ui_ux","bug","performance","accessibility","security","navigation",
  "auth","data_sync","hardware","question","code","database","thermal",
];

export type TicketStatus   = "open" | "in_progress" | "resolved";
export type TicketSeverity = "low" | "medium" | "high" | "critical";

export interface TicketAdminRow {
  id: string;
  submitter_profile_id: string;
  submitter_role: "clinic" | "patient";
  category: TicketCategory;
  subject: string;
  body: string;
  status: TicketStatus;
  severity: TicketSeverity | null;
  admin_response: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined.
  submitter: {
    full_name: string;
    email: string;
  } | null;
}

export async function listTickets(filter: TicketStatus | "all" = "open"): Promise<TicketAdminRow[]> {
  let q = getSupabase()
    .from("support_tickets")
    .select(
      "id, submitter_profile_id, submitter_role, category, subject, body, status, severity, " +
      "admin_response, resolved_at, created_at, updated_at, " +
      "submitter:profiles!support_tickets_submitter_profile_id_fkey ( full_name, email )",
    )
    .order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TicketAdminRow[];
}

export async function resolveTicket(ticketId: string, status: TicketStatus, response?: string): Promise<void> {
  const { error } = await getSupabase().rpc("admin_resolve_ticket", {
    p_ticket_id: ticketId,
    p_status:    status,
    p_response:  response ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function setTicketSeverity(ticketId: string, severity: TicketSeverity | null): Promise<void> {
  const { error } = await getSupabase().rpc("admin_set_ticket_severity", {
    p_ticket_id: ticketId,
    p_severity:  severity,
  });
  if (error) throw new Error(error.message);
}

// ── Counts (admin dashboard) ────────────────────────────────────

export interface AdminCounts {
  pendingClinics:        number;
  pendingPasswordResets: number;
  openTickets:           number;
  inProgressTickets:     number;
}

export interface TicketDashboardStats {
  total:              number;
  unassigned_severity: number;
  resolved_last_7d:   number;
  opened_last_7d:     number;
  by_status:    Partial<Record<TicketStatus | "unknown", number>>;
  by_severity:  Partial<Record<TicketSeverity | "unassigned", number>>;
  by_category:  Partial<Record<TicketCategory | "unknown", number>>;
  by_role:      Partial<Record<"clinic" | "patient" | "unknown", number>>;
}

export async function fetchTicketDashboardStats(): Promise<TicketDashboardStats> {
  const { data, error } = await getSupabase().rpc("admin_ticket_dashboard_stats");
  if (error) throw new Error(error.message);
  return data as TicketDashboardStats;
}

export interface TicketActivityPoint {
  day:      string; // ISO date or timestamp the server returned for that day
  opened:   number;
  resolved: number;
}

export async function fetchTicketActivityTimeseries(days: number = 30): Promise<TicketActivityPoint[]> {
  const { data, error } = await getSupabase().rpc("admin_ticket_activity_timeseries", { p_days: days });
  if (error) throw new Error(error.message);
  return (data ?? []) as TicketActivityPoint[];
}

export async function fetchAdminCounts(): Promise<AdminCounts> {
  const sb = getSupabase();
  const [c1, c2, c3, c4] = await Promise.all([
    sb.from("clinics")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending"),
    sb.from("clinic_password_reset_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    sb.from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    sb.from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
  ]);
  if (c1.error || c2.error || c3.error || c4.error) {
    throw new Error(c1.error?.message ?? c2.error?.message ?? c3.error?.message ?? c4.error?.message ?? "Counts failed");
  }
  return {
    pendingClinics:        c1.count ?? 0,
    pendingPasswordResets: c2.count ?? 0,
    openTickets:           c3.count ?? 0,
    inProgressTickets:     c4.count ?? 0,
  };
}
