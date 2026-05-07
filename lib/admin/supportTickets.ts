// lib/admin/supportTickets.ts
// Typed wrappers for the support_tickets table added in
// 20260508_admin_gating_and_tickets.sql.
//
// Submit (any authenticated user) routes through the SECURITY DEFINER
// RPC `submit_support_ticket`. List (own tickets) is a plain SELECT
// gated by the row-level policy `tickets_select`.

import { supabase } from "../supabase";

export type TicketCategory = "bug" | "feature_request" | "question" | "billing";
export type TicketStatus   = "open" | "in_progress" | "resolved";

export interface SupportTicket {
  id: string;
  submitter_profile_id: string;
  submitter_role: "clinic" | "patient";
  category: TicketCategory;
  subject: string;
  body: string;
  status: TicketStatus;
  admin_response: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug:             "Bug",
  feature_request: "Feature request",
  question:        "Question",
  billing:         "Billing",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open:        "Open",
  in_progress: "In progress",
  resolved:    "Resolved",
};

export interface SubmitTicketParams {
  category: TicketCategory;
  subject:  string;
  body:     string;
}

/** File a new ticket. Returns the newly-created row's id on success. */
export async function submitSupportTicket(params: SubmitTicketParams): Promise<string> {
  const { data, error } = await supabase.rpc("submit_support_ticket", {
    p_category: params.category,
    p_subject:  params.subject,
    p_body:     params.body,
  });
  if (error) throw new Error(error.message);
  return data as string;
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
