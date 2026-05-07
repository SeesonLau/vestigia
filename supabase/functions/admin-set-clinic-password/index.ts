// supabase/functions/admin-set-clinic-password/index.ts
// Admin-only Edge Function. Sets a clinic user's password via the
// service-role auth.admin.updateUserById API and marks the matching
// clinic_password_reset_requests row as approved.
//
// Auth model:
//   1. Caller MUST send a Bearer JWT in Authorization. We validate it
//      with the user-scoped client (auth.getUser) and read the role
//      from the profiles table — only role === "admin" is allowed
//      through. The mobile-side `is_admin()` SQL helper checks the
//      same column, so this is consistent with the rest of the system.
//   2. Once admin is verified, we use the service-role client to do
//      the password update + row stamp.
//
// Body:
//   { request_id: uuid, profile_id: uuid, new_password: string }

import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  request_id:   string;
  profile_id:   string;
  new_password: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return json({ error: "Server misconfigured" }, 500);
  }

  // ── Caller auth ────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Missing bearer token" }, 401);
  }

  // User-scoped client validates the JWT signature server-side.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Invalid or expired token" }, 401);
  }
  const callerId = userData.user.id;

  // Service-role client — used for everything past this point.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Check that the caller is an admin. Service role bypasses RLS so
  // we get a deterministic answer here.
  const { data: callerProfile, error: profErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();
  if (profErr || !callerProfile || callerProfile.role !== "admin") {
    return json({ error: "Admin access required" }, 403);
  }

  // ── Body ────────────────────────────────────────────────────────
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.request_id || !UUID_RE.test(body.request_id)) {
    return json({ error: "Invalid request_id" }, 400);
  }
  if (!body.profile_id || !UUID_RE.test(body.profile_id)) {
    return json({ error: "Invalid profile_id" }, 400);
  }
  if (typeof body.new_password !== "string" || body.new_password.length < 8) {
    return json({ error: "new_password must be at least 8 characters" }, 400);
  }

  // Sanity: the request row must exist, point at the same profile, and
  // not already be resolved. Prevents an admin from accidentally setting
  // a password against a stale/wrong request id.
  const { data: requestRow, error: reqErr } = await admin
    .from("clinic_password_reset_requests")
    .select("id, clinic_profile_id, status")
    .eq("id", body.request_id)
    .single();
  if (reqErr || !requestRow) {
    return json({ error: "Reset request not found" }, 404);
  }
  if (requestRow.clinic_profile_id !== body.profile_id) {
    return json({ error: "profile_id does not match the reset request" }, 400);
  }
  if (requestRow.status !== "pending") {
    return json({ error: `Reset request is already ${requestRow.status}` }, 409);
  }

  // ── Update password ────────────────────────────────────────────
  const { error: updErr } = await admin.auth.admin.updateUserById(body.profile_id, {
    password: body.new_password,
  });
  if (updErr) {
    return json({ error: updErr.message }, 400);
  }

  // ── Stamp the request row ──────────────────────────────────────
  const { error: stampErr } = await admin
    .from("clinic_password_reset_requests")
    .update({
      status:       "approved",
      reviewed_by:  callerId,
      reviewed_at:  new Date().toISOString(),
    })
    .eq("id", body.request_id);
  if (stampErr) {
    // Password is already changed; surface the stamp failure but don't
    // try to "undo" the password since the clinic now needs the new one.
    return json({
      warning: "Password updated but failed to stamp request row",
      detail:  stampErr.message,
    }, 200);
  }

  return json({ success: true });
});
