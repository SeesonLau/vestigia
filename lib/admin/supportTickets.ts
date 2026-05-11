// lib/admin/supportTickets.ts
// Typed wrappers for the support_tickets table added in
// 20260508_admin_gating_and_tickets.sql.
//
// Submit (any authenticated user) routes through the SECURITY DEFINER
// RPC `submit_support_ticket`. List (own tickets) is a plain SELECT
// gated by the row-level policy `tickets_select`.

import { supabase } from "../supabase";

// User-pickable categories. The dev-only categories (code/database/
// thermal) exist on the server side too — they were seeded from the
// QA log — but the mobile picker hides them so end-users only see
// categories that map to surfaces they actually touch.
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

export type TicketStatus   = "open" | "in_progress" | "resolved";
export type TicketSeverity = "low" | "medium" | "high" | "critical";

export interface SupportTicket {
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
}

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
  // Dev-only — only appear on already-seeded historical rows.
  code:          "Code quality",
  database:      "Database",
  thermal:       "Thermal pipeline",
};

// Categories the mobile picker offers to end-users — in display order.
export const USER_FACING_CATEGORIES: TicketCategory[] = [
  "ui_ux",
  "bug",
  "performance",
  "accessibility",
  "security",
  "navigation",
  "auth",
  "data_sync",
  "hardware",
  "question",
];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open:        "Open",
  in_progress: "In progress",
  resolved:    "Resolved",
};

export interface SubmitTicketParams {
  category: TicketCategory;
  body:     string;
}

export interface SubmitTicketResult {
  id:      string;
  subject: string;
}

/**
 * File a new ticket. The server auto-assigns a QA-code subject
 * (e.g. UX-22, BUG-23) keyed off the category, continuing the existing
 * QA sequence. Returns both the new row id and the assigned subject so
 * the caller can show the user their ticket code.
 */
export async function submitSupportTicket(params: SubmitTicketParams): Promise<SubmitTicketResult> {
  const { data, error } = await supabase.rpc("submit_support_ticket", {
    p_category: params.category,
    p_body:     params.body,
  });
  if (error) throw new Error(error.message);
  const out = data as { id: string; subject: string } | null;
  if (!out?.id || !out?.subject) {
    throw new Error("Server did not return a ticket id.");
  }
  return out;
}

/**
 * List tickets the caller can see. Patient + clinic users only see
 * their own (RLS); admins see everything (but admin-side queries
 * happen on the web).
 */
export async function listMyTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportTicket[];
}

export async function fetchTicketById(id: string): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as SupportTicket | null;
}
