# Data Layer Checklist
**Last verified:** 2026-05-07 (full-codebase QA audit @ `main 0414e79`)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Issue found

---

## Supabase Tables — Schema Match

| Table | Exists | Columns Match Schema | RLS Enabled | Notes |
|---|---|---|---|---|
| `profiles` | ✅ | ✅ | ✅ | FK to auth.users; created by `handle_new_user()` trigger; `avatar_url` column added by `20260407_avatar_support.sql` |
| `clinics` | ✅ | ✅ | ✅ | `avatar_url` column present |
| `patients` | ✅ | ✅ | ✅ | |
| `devices` | ✅ | ✅ | ✅ | |
| `screening_sessions` | ✅ | ✅ | ✅ | |
| `thermal_captures` | ✅ | ✅ | ✅ | `feed_mode TEXT NOT NULL DEFAULT 'unprocessed'` added by `20260507120000_add_feed_mode_to_thermal_captures.sql`; `processed_image_path` relaxed to nullable for the new 3-slot pipeline |
| `patient_vitals` | ✅ | ✅ | ✅ | |
| `classification_results` | ✅ | ✅ | ✅ | |
| `system_config` | ✅ | ✅ | ✅ | Admin-only RLS |
| `data_requests` | ✅ | ✅ | ✅ | Offline → online sync request table |
| `clinic_access_relationships` | ✅ | ✅ | ✅ | Added by `20260503140000_clinic_access_relationship.sql`; pairs patient ↔ clinic with status |

---

## Foreign Keys — All Verified ✅

| Table | Column | References |
|---|---|---|
| `profiles` | `clinic_id` | → `clinics.id` |
| `patients` | `profile_id` | → `profiles.id` |
| `patients` | `clinic_id` | → `clinics.id` |
| `devices` | `clinic_id` | → `clinics.id` |
| `screening_sessions` | `subject_profile_id` | → `profiles.id` |
| `screening_sessions` | `patient_id` | → `patients.id` |
| `screening_sessions` | `operator_id` | → `profiles.id` |
| `screening_sessions` | `device_id` | → `devices.id` |
| `screening_sessions` | `clinic_id` | → `clinics.id` |
| `thermal_captures` | `session_id` | → `screening_sessions.id` |
| `patient_vitals` | `session_id` | → `screening_sessions.id` |
| `classification_results` | `session_id` | → `screening_sessions.id` |
| `data_requests` | `from_profile_id` | → `profiles.id` |
| `data_requests` | `to_profile_id` | → `profiles.id` |
| `clinic_access_relationships` | `clinic_id` | → `clinics.id` |
| `clinic_access_relationships` | `patient_profile_id` | → `profiles.id` |

---

## RLS Policies — Per Table

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|---|
| `profiles` | ✅ self + clinic same-clinic + admin | ✅ via trigger | ✅ self + clinic + admin | ❌ | |
| `clinics` | ✅ anon reads active + clinic reads own + admin | ❌ (admin only) | ✅ clinic + admin | ❌ | |
| `patients` | ✅ self + clinic + admin | ✅ WITH CHECK clinic_id = caller | ✅ clinic + admin | ❌ | |
| `devices` | ✅ clinic + admin | ✅ WITH CHECK clinic_id = caller | ✅ clinic + admin | ❌ | |
| `screening_sessions` | ✅ patient + clinic + admin | ✅ WITH CHECK clinic_id = caller | ✅ clinic + admin | ❌ | |
| `thermal_captures` | ✅ patient + clinic + admin | ✅ WITH CHECK session in own clinic | ❌ | ❌ | |
| `patient_vitals` | ✅ patient + clinic + admin | ✅ WITH CHECK session in own clinic | ✅ clinic + admin | ❌ | |
| `classification_results` | ✅ patient + clinic + admin | ✅ WITH CHECK session in own clinic | ❌ | ❌ | |
| `system_config` | ✅ admin only | ✅ admin only | ✅ admin only | ✅ admin only | |
| `data_requests` | ✅ from or to | ✅ clinic inserts | ✅ to (patient) updates | ❌ | |
| `clinic_access_relationships` | ✅ clinic + patient | ✅ via `request_clinic_access` RPC | ✅ via `respond_to_clinic_access` / `revoke_clinic_access` RPCs | ❌ | All mutations gated by RPCs (not direct PostgREST) |
| `storage.objects` (avatars bucket) | ✅ public reads | ✅ WITH CHECK path begins `profiles/<auth.uid()>/` or `clinics/<owned-clinic>/` | ✅ same | ❌ | Bucket flipped to public on 2026-05-07 |
| `storage.objects` (thermal-images / thermal-csv) | ✅ clinic + patient (via session ownership) | ✅ same | ❌ | ❌ | Path-prefix policies extended to clinic_access on 2026-05-03 |

> All INSERT policies have `WITH CHECK` clauses where applicable.

---

## Storage Buckets

| Bucket | Visibility | Notes |
|---|---|---|
| `avatars` | public | RLS still enforces write path = `profiles/<auth.uid()>/...` or `clinics/<owned-clinic-id>/...` |
| `thermal-images` | private (signed URLs) | Bundle viewer signs all paths in one batch |
| `thermal-csv` | private (signed URLs) | Same |

---

## RPCs

| Name | Migration | Purpose |
|---|---|---|
| `find_patient_by_code` | `20260503130000_find_patient_by_code_rpc.sql` | Lookup by global patient_code |
| `request_clinic_access` | `20260503140000_clinic_access_relationship.sql` | Clinic asks patient to share history |
| `respond_to_clinic_access` | same | Patient accept/reject |
| `revoke_clinic_access` | same | Either side revokes |
| `submit_session_to_clinic` | `20260503150000_submit_session_to_clinic_rpc.sql` (+ `20260503160000_fix_submit_session_ambiguous_columns.sql`) | Patient pushes a self-screening to a clinic |

All RPC names verified against consumer call sites.

---

## TypeScript Types vs Actual DB Columns

| Type | Status | Notes |
|---|---|---|
| `AuthUser` | ✅ | Includes `phone`, `created_at`, `updated_at`, `avatar_url` |
| `ScreeningSession` | ✅ | Includes `app_version`, `bundle_code` |
| `PatientVitals` | ✅ | Includes `id`, `session_id`, `recorded_at` |
| `ThermalCapture` | ✅ | Includes `resolution_x`, `resolution_y`, `feed_mode?` (nullable union with `'unprocessed' \| 'processed'`), `processed_image_path: string \| null` |
| `ClassificationResult` | ✅ | Includes `result_payload` (JSONB) — added 2026-05-04 |
| `Patient` | ✅ | |
| `LocalCapture` | ✅ | SQLite shape (legacy; superseded by `ThermalBundle` for offline guest flow) |
| `DataRequest` | ✅ | |
| `BundlePatient`, `FootData`, `ThermalBundle` | ✅ | New AsyncStorage-backed offline shape (`lib/thermal/bundleStorage.ts`) |
| `MeasurementParams` | ✅ | `{ emissivity, reflectedTempC }` — `lib/thermal/measurementParams.ts` |
| `FrameStats` | ✅ | Extended with `hotX/Y/Temp`, `coldX/Y/Temp`, `meanTemp` for crosshair overlay |
| `Clinic` | ❌ | Not in `types/index.ts` — local interface in admin / pairing screens |
| `Device` | ❌ | Same |
| `SystemConfig` | ❌ | No type for `system_config` rows |

---

## Local DB / Offline Storage

| Component | Status | Notes |
|---|---|---|
| `expo-sqlite` v16 | ✅ | Bare workflow compatible |
| `lib/db/localDb.ts` (`getDb()`, `migrate()`, `generateLocalId()`) | ✅ | Schema v1 |
| `lib/db/offlineCaptures.ts` (`saveCapture`, `getAllCaptures`, `markSynced`, etc.) | ✅ | Used by the legacy `(patient)/save.tsx` route only |
| `lib/thermal/bundleStorage.ts` (AsyncStorage) | ✅ | Used by the new offline-guest flow `(offline)/patient-details → history → bundle-detail`. Stores `BundlePatient` + `left/right FootData` + `bundle_code` index |
| Sync logic (offline → Supabase) | ✅ | `(clinic)/sync.tsx` uploads SQLite captures; `(patient)/submit-to-clinic.tsx` for the AsyncStorage bundles |
| Patient accept/reject | ✅ | `(patient)/sync.tsx` calls `respond_to_clinic_access` |

> **WatermelonDB** orphaned (CODE-20). `lib/database/` and `node_modules/@nozbe/watermelondb` no longer imported anywhere; safe to delete in a follow-up sweep.

---

## Auth & Security

| Item | Status | Notes |
|---|---|---|
| Supabase anon key only on client | ✅ | No service_role in client code |
| `EXPO_PUBLIC_*` env var prefix | ✅ | URL + anon key |
| Auth session via Supabase | ✅ | `signInWithPassword`, `onAuthStateChange`, JWT cold start |
| RLS enabled on all tables | ✅ | All 11 tables verified |
| INSERT WITH CHECK clauses | ✅ | All applicable |
| Storage RLS path enforcement | ✅ | `avatars_write` policy verified — write path must start with `profiles/<auth.uid()>/` or `clinics/<owned-clinic>/`. Avatar upload path was bug-fixed on 2026-05-07 to satisfy the policy (SEC-04) |
| Avatars bucket visibility | ✅ | Public (per `20260507130000_avatars_bucket_public.sql`) so the public URL we store on `profiles.avatar_url` actually loads. Writes still gated by RLS |
| Input sanitization before Supabase | ✅ | Glucose, BP, HR, HbA1c all validated; emissivity / reflected-temp clamped |
| No `console.log` with sensitive data | ✅ | Audited |
| `dbg()` guarded by `__DEV__` | ✅ | |
| Login lockout (5 attempts / 30 s) | ✅ | `store/authStore.ts` |
| Inactivity timeout | ✅ | `useInactivityTimeout` mounted at `app/_layout.tsx:14` |
| Deep link handler (password reset) | ✅ | `app/_layout.tsx:20-30` |
| Server-side admin role rejection | ✅ | Auth store signs out admin role on mobile login. CODE-19: residual unreachable `/(admin)` switch branch in `login.tsx:52` should be removed |

---

## Native Module — UVCModule.kt (capture pipeline)

| Component | Status | Notes |
|---|---|---|
| Y16 frame ingest | ✅ | 160×120 raw |
| 3×3 median filter | ✅ | Native sensor scale |
| Motion-adaptive temporal EMA | ✅ | Per-pixel α based on inter-frame Δ; smooth still pixels, instant on motion |
| CLAHE (8×8 tiles, clipLimit 3.0) | ✅ | Local contrast |
| Bilinear upscale to 320×240 | ✅ | Toggle off in Raw mode |
| Unsharp mask (3×3 box, amount 0.6) | ✅ | After upscale |
| JPEG q95 (Enhanced) / q90 (Raw) | ✅ | |
| Emissivity / reflected-temp correction | ✅ | One-sided, fast `sqrt(sqrt(...))` shortcut for `^0.25` |
| `setLiveProcessing(enhanced: Boolean)` | ✅ | Volatile flip; clears EMA history when going Raw |
| `setMeasurementParams(eps, reflTempC)` | ✅ | Clamped + persisted |
| `setStatsRoi(x,y,w,h)` / `clearStatsRoi()` | ✅ | Bounds the crosshair scan to the framing rectangle |
| `processCapture` capture pipeline | ✅ | `enhanced` opt collapses old `upscale` + `feedMode`; always emits 3-slot bundle (`unprocessed` shape); slot 2 nullable |
| Foot isolation: hole fill + moat sampler + one-sided threshold + largest-component | ✅ | Replaces the previous closing-only / two-sided / all-outside-pixels approach; closes the donut-hole and under-isolation failure modes |

---

## Summary

| Area | Status | Notes |
|---|---|---|
| Supabase schema (11 tables) | ✅ All verified | Includes `clinic_access_relationships`; `thermal_captures.feed_mode` added |
| Foreign keys (16 relationships) | ✅ All verified | |
| RLS enabled | ✅ All tables + storage buckets | |
| RLS INSERT WITH CHECK | ✅ All applicable | |
| Storage buckets | ✅ avatars (public), thermal-images / thermal-csv (private) | |
| RPCs | ✅ 5 verified | All names match consumer call sites |
| TypeScript types — core | ✅ All match DB | |
| TypeScript types — admin / config | ⚠️ Partial | `Clinic`, `Device`, `SystemConfig` missing from `types/index.ts` (low priority) |
| Local DB | ✅ Complete | expo-sqlite + AsyncStorage bundle store; sync flow working |
| Offline guest flow | ✅ Complete | Capture → patient details → bundleStorage → history → bundle detail |
| Auth & Security | ✅ All checks pass | One residual dead `/(admin)` branch (CODE-19) |
| Native UVC pipeline | ✅ Complete | Full enhancement chain with Raw / Enhanced toggle |
