// lib/thermal/localBundleSync.ts
// Push a locally-stored ThermalBundle (AsyncStorage) into Supabase.
//
// Both roles funnel through this helper:
//   • clinic-side sync attaches the bundle to a clinic-managed patient row
//     and uses the operator's user id as `operator_id`; the patient picker
//     in (clinic)/sync-local-bundle supplies the snapshot fields.
//   • patient-side sync attaches the bundle to the signed-in patient's own
//     profile (no clinic, no operator); the snapshot is sourced from the
//     patient's profile + the optional weight/height confirmation step.
//
// After a successful upload the AsyncStorage bundle is marked synced via
// `markBundleSynced`, so subsequent loads of the Local tab in clinic/
// patient history show it as Synced and not Unsynced.

import { supabase } from "../supabase";
import { markBundleSynced, type ThermalBundle } from "./bundleStorage";

export interface SyncPatientSnapshot {
  first_name:  string;
  middle_name: string | null;
  last_name:   string;
  sex:         string | null;          // 'male' | 'female' | 'other' | null
  date_of_birth: string | null;        // YYYY-MM-DD
  weight_kg:   number | null;
  height_cm:   number | null;
}

export interface SyncSessionMeta {
  capture_mode:        "patient_self" | "clinical";
  subject_profile_id:  string | null;  // the patient's profile id
  patient_id:          string | null;  // clinic-side patients.id; null for self-sync
  clinic_id:           string | null;  // clinic syncing the bundle; null for self-sync
  operator_id:         string | null;  // auth.uid() of the clinic operator; null for self-sync
  patient_snapshot:    SyncPatientSnapshot;
}

export interface SyncBundleResult {
  session_id: string;
}

/**
 * Parse a comma-separated thermal CSV (one row per matrix row, no header)
 * back into a number[][]. Used to satisfy the `thermal_captures.thermal_matrix`
 * NOT NULL column, which the live capture path fills from the in-memory store
 * but the offline-save path discards by the time the bundle lands here.
 */
function parseCsvMatrix(csv: string): number[][] {
  const trimmed = csv.trim();
  if (!trimmed) return [[0]];
  const rows = trimmed.split(/\r?\n/);
  return rows.map((line) =>
    line.split(",").map((cell) => {
      const n = Number(cell);
      return Number.isFinite(n) ? n : 0;
    }),
  );
}

/** Decode a base64 PNG string into a Uint8Array for storage upload. */
function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function uploadPng(b64: string, sessionId: string, foot: string, kind: string): Promise<string | null> {
  if (!b64) return null;
  const path = `${sessionId}/${foot}/${kind}.png`;
  const bytes = base64ToBytes(b64);
  const { error } = await supabase.storage
    .from("thermal-images")
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  return error ? null : path;
}

async function uploadCsv(text: string, sessionId: string, foot: string): Promise<string | null> {
  if (!text) return null;
  const path = `${sessionId}/${foot}.csv`;
  const { error } = await supabase.storage
    .from("thermal-csv")
    .upload(path, text, { contentType: "text/csv", upsert: true });
  return error ? null : path;
}

export async function syncLocalBundle(
  bundle: ThermalBundle,
  meta: SyncSessionMeta,
): Promise<SyncBundleResult> {
  // 1. Create the screening_sessions row. The session id is what we'll use
  //    as the storage path prefix below, so we need it before the uploads.
  const { data: sessionRow, error: sessionErr } = await supabase
    .from("screening_sessions")
    .insert({
      bundle_code:        bundle.bundle_code,
      capture_mode:       meta.capture_mode,
      status:             "completed",
      subject_profile_id: meta.subject_profile_id,
      patient_id:         meta.patient_id,
      clinic_id:          meta.clinic_id,
      operator_id:        meta.operator_id,
      patient_snapshot:   meta.patient_snapshot,
      started_at:         bundle.captured_at,
      completed_at:       bundle.captured_at,
    })
    .select("id")
    .single();
  if (sessionErr || !sessionRow) {
    throw new Error(sessionErr?.message ?? "Could not create screening session.");
  }
  const sessionId = sessionRow.id as string;

  // 2. Per-foot uploads + thermal_captures inserts. Both feet share the same
  //    session id and so their storage paths sit under the same prefix.
  const feet: Array<{
    foot: "left" | "right";
    data: ThermalBundle["left"];
  }> = [
    { foot: "left",  data: bundle.left  },
    { foot: "right", data: bundle.right },
  ];

  for (const { foot, data } of feet) {
    const [rawPath, processedPath, isolatedPath, csvPath] = await Promise.all([
      uploadPng(data.raw_image_b64,       sessionId, foot, "raw"),
      uploadPng(data.processed_image_b64, sessionId, foot, "processed"),
      uploadPng(data.isolated_image_b64,  sessionId, foot, "isolated"),
      uploadCsv(data.csv_content,         sessionId, foot),
    ]);
    if (!rawPath || !processedPath || !isolatedPath) {
      throw new Error(`Failed to upload ${foot} foot images.`);
    }

    const matrix = parseCsvMatrix(data.csv_content);
    const resX = matrix[0]?.length ?? 320;
    const resY = matrix.length || 240;

    const { error: capErr } = await supabase.from("thermal_captures").insert({
      session_id:           sessionId,
      foot,
      thermal_matrix:       matrix,
      min_temp_c:           data.stats.min,
      max_temp_c:           data.stats.max,
      mean_temp_c:          data.stats.mean,
      resolution_x:         resX,
      resolution_y:         resY,
      raw_image_path:       rawPath,
      processed_image_path: processedPath,
      isolated_image_path:  isolatedPath,
      csv_path:             csvPath,
      feed_mode:            "processed",
      captured_at:          bundle.captured_at,
    });
    if (capErr) throw new Error(`Failed to save ${foot} thermal capture: ${capErr.message}`);
  }

  // 3. Stamp the local bundle as synced so the Local tab shows the right
  //    badge on the next render. Best-effort — the cloud copy already
  //    exists at this point.
  await markBundleSynced(bundle.bundle_code).catch(() => {});

  return { session_id: sessionId };
}
