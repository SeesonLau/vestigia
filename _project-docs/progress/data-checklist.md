# Data Layer Checklist
**Last verified:** 2026-05-08 (full-codebase QA audit @ `main eac6ed3`)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Issue found

---

## Supabase Tables — Schema Match

| Table | Exists | Columns Match Schema | RLS Enabled | Notes |
|---|---|---|---|---|
| `profiles` | ✅ | ✅ | ✅ | FK to auth.users; created by `handle_new_user()` trigger; `avatar_url` column added by `20260407_avatar_support.sql` |
| `clinics` | ✅ | ✅ | ✅ | `avatar_url` column present. `approval_status` (TEXT NOT NULL DEFAULT 'pending' CHECK IN pending/approved/rejected) + `approved_by`, `approved_at`, `rejection_reason` added 2026-05-07. Existing rows back-filled to `approved` |
| `patients` | ✅ | ✅ | ✅ | |
| `devices` | ✅ | ✅ | ✅ | |
| `screening_sessions` | ✅ | ✅ | ✅ | |
| `thermal_captures` | ✅ | ✅ | ✅ | `feed_mode TEXT NOT NULL DEFAULT 'unprocessed'`; `processed_image_path` nullable for the 3-slot pipeline |
| `patient_vitals` | ✅ | ✅ | ✅ | |
| `classification_results` | ✅ | ✅ | ✅ | |
| `system_config` | ✅ | ✅ | ✅ | Admin-only RLS |
| `data_requests` | ✅ | ✅ | ✅ | Offline → online sync request table |
| `clinic_access_relationships` | ✅ | ✅ | ✅ | Pairs patient ↔ clinic with status |
| `clinic_password_reset_requests` | ✅ | ✅ | ✅ | New 2026-05-07. Requester INSERT via `submit_password_reset_request` RPC; admin SELECT/UPDATE; resolved by the `admin-set-clinic-password` Edge Function which stamps `status='approved'`, `reviewed_by`, `reviewed_at` |
| `support_tickets` | ✅ | ✅ | ✅ | New 2026-05-07. Submitter (clinic / patient) INSERT via `submit_support_ticket` RPC; admin UPDATE via `admin_resolve_ticket`; submitter SELECT own + admin SELECT all. Length checks (subject 3–120, body 3–4000); `updated_at` trigger |

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
| `clinics` | `approved_by` | → `profiles.id` |
| `clinic_password_reset_requests` | `clinic_profile_id` | → `profiles.id` (ON DELETE CASCADE) |
| `clinic_password_reset_requests` | `reviewed_by` | → `profiles.id` |
| `support_tickets` | `submitter_profile_id` | → `profiles.id` (ON DELETE CASCADE) |
| `support_tickets` | `resolved_by` | → `profiles.id` |

---

## RLS Policies — Per Table

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|---|
| `profiles` | ✅ self + clinic same-clinic + admin | ✅ via trigger | ✅ self + clinic + admin | ❌ | |
| `clinics` | ✅ owner reads own (incl. `approval_status`) + admin | ❌ (admin only) | ✅ clinic + admin (admin-only columns fenced by `clinics_block_non_admin_approval_change` trigger) | ❌ | |
| `patients` | ✅ self + clinic + admin | ✅ WITH CHECK clinic_id = caller | ✅ clinic + admin | ❌ | |
| `devices` | ✅ clinic + admin | ✅ WITH CHECK clinic_id = caller | ✅ clinic + admin | ❌ | |
| `screening_sessions` | ✅ patient + clinic + admin | ✅ WITH CHECK clinic_id = caller | ✅ clinic + admin | ❌ | |
| `thermal_captures` | ✅ patient + clinic + admin | ✅ WITH CHECK session in own clinic | ❌ | ❌ | |
| `patient_vitals` | ✅ patient + clinic + admin | ✅ WITH CHECK session in own clinic | ✅ clinic + admin | ❌ | |
| `classification_results` | ✅ patient + clinic + admin | ✅ WITH CHECK session in own clinic | ❌ | ❌ | |
| `system_config` | ✅ admin only | ✅ admin only | ✅ admin only | ✅ admin only | |
| `data_requests` | ✅ from or to | ✅ clinic inserts | ✅ to (patient) updates | ❌ | |
| `clinic_access_relationships` | ✅ clinic + patient | ✅ via `request_clinic_access` RPC | ✅ via `respond_to_clinic_access` / `revoke_clinic_access` RPCs | ❌ | All mutations gated by RPCs |
| `clinic_password_reset_requests` | ✅ requester reads own + admin reads all | ✅ requester only (`clinic_profile_id = auth.uid()`); RPC writes the row | ✅ admin only | ❌ | Edge Function (`admin-set-clinic-password`) does the SECURITY DEFINER admin update under service role |
| `support_tickets` | ✅ submitter reads own + admin reads all | ✅ any authenticated user (`submitter_profile_id = auth.uid()`); RPC submits | ✅ admin only (via `admin_resolve_ticket`) | ❌ | |
| `storage.objects` (avatars bucket) | ✅ public reads | ✅ WITH CHECK path begins `profiles/<auth.uid()>/` or `clinics/<owned-clinic>/` | ✅ same | ❌ | |
| `storage.objects` (thermal-images / thermal-csv) | ✅ clinic + patient (via session ownership) | ✅ same | ❌ | ❌ | |

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
| `submit_password_reset_request` | `20260508_admin_gating_and_tickets.sql` | Logged-in clinic files a reset; reads `auth.uid()`; inserts a `pending` row |
| `submit_support_ticket` | same | Patient + clinic; insert support ticket; submitter role inferred from `profiles.role` |
| `admin_approve_clinic` | same | Admin-only (`is_admin()` guard); flips status, stamps `approved_by`/`approved_at` |
| `admin_reject_clinic` | same | Admin-only; sets `rejection_reason` |
| `admin_resolve_ticket` | same | Admin-only; updates status + response; sets `resolved_at`/`resolved_by` when status='resolved' |

All RPC names verified against consumer call sites.

---

## Edge Functions

| Name | Path | Auth | Notes |
|---|---|---|---|
| `clinic-signup` | `supabase/functions/clinic-signup/index.ts` | service-role | Creates clinic auth user (`email_confirm: true`), inserts `clinics` row, links `profiles.clinic_id`. Idempotent rollback on partial failure |
| `auth-redirect` | `supabase/functions/auth-redirect/index.ts` | none | Static HTML page that bridges email links to the mobile app via `vestigia://confirm` |
| `admin-set-clinic-password` | `supabase/functions/admin-set-clinic-password/index.ts` | bearer JWT + admin-role check | New 2026-05-07. Validates caller JWT via `auth.getUser()`; reads `profiles.role` via service role; only `admin` past the gate. Validates UUIDs and password length, asserts the request row exists / matches `profile_id` / is still `pending`, then `auth.admin.updateUserById(profile_id, { password })` and stamps `clinic_password_reset_requests.status='approved'`. Deployed v1, ACTIVE, `verify_jwt: true` |

---

## TypeScript Types vs Actual DB Columns

| Type | Status | Notes |
|---|---|---|
| `AuthUser` | ✅ | Includes `phone`, `created_at`, `updated_at`, `avatar_url` |
| `ScreeningSession` | ✅ | Includes `app_version`, `bundle_code` |
| `PatientVitals` | ✅ | Includes `id`, `session_id`, `recorded_at` |
| `ThermalCapture` | ✅ | Includes `resolution_x`, `resolution_y`, `feed_mode?`, `processed_image_path: string \| null` |
| `ClassificationResult` | ✅ | Includes `result_payload` (JSONB) |
| `Patient` | ✅ | |
| `LocalCapture` | ✅ | SQLite shape (legacy) |
| `DataRequest` | ✅ | |
| `BundlePatient`, `FootData`, `ThermalBundle` | ✅ | AsyncStorage offline shape |
| `MeasurementParams` | ✅ | `lib/thermal/measurementParams.ts` |
| `FrameStats` | ✅ | Extended with `hotX/Y/Temp`, `coldX/Y/Temp`, `meanTemp` for crosshair overlay |
| `ClinicApproval` (`approval_status`, `rejection_reason`) | ✅ | Local in `lib/admin/clinicApproval.ts` (mobile) |
| `SupportTicket`, `TicketCategory`, `TicketStatus` | ✅ | `lib/admin/supportTickets.ts` (mobile) |
| `ClinicAdminRow`, `PasswordResetRow`, `TicketAdminRow`, `AdminCounts` | ✅ | `web/lib/admin-rpc.ts` (admin web) |
| `Clinic` (full) | ❌ | Not in `types/index.ts` — local interface in admin / pairing screens |
| `Device` | ❌ | Same |
| `SystemConfig` | ❌ | No type for `system_config` rows |

---

## Local DB / Offline Storage

| Component | Status | Notes |
|---|---|---|
| `expo-sqlite` v16 | ✅ | Bare workflow compatible |
| `lib/db/localDb.ts` (`getDb()`, `migrate()`, `generateLocalId()`) | ✅ | Schema v1 |
| `lib/db/offlineCaptures.ts` (`saveCapture`, `getAllCaptures`, `markSynced`, etc.) | ✅ | Used by the legacy `(patient)/save.tsx` route only |
| `lib/thermal/bundleStorage.ts` (AsyncStorage) | ✅ | Used by the new offline-guest flow `(offline)/patient-details → history → bundle-detail` |
| Sync logic (offline → Supabase) | ✅ | `(clinic)/sync.tsx` uploads SQLite captures; `(patient)/submit-to-clinic.tsx` for the AsyncStorage bundles |
| Patient accept/reject | ✅ | `(patient)/sync.tsx` calls `respond_to_clinic_access` |

> **WatermelonDB** orphaned (CODE-20). `lib/database/` and `node_modules/@nozbe/watermelondb` no longer imported anywhere; safe to delete in a follow-up sweep.

---

## Auth & Security

| Item | Status | Notes |
|---|---|---|
| Supabase anon key only on client (mobile + web) | ✅ | No service_role in client code |
| Service role only inside Edge Functions | ✅ | `clinic-signup` and `admin-set-clinic-password` |
| `EXPO_PUBLIC_*` env var prefix (mobile) | ✅ | URL + anon key |
| `NEXT_PUBLIC_*` env var prefix (web) | ✅ | URL + anon key in `web/.env.local`; gitignored |
| Auth session via Supabase | ✅ | `signInWithPassword`, `onAuthStateChange`, JWT cold start |
| RLS enabled on all tables | ✅ | All 13 tables verified |
| INSERT WITH CHECK clauses | ✅ | All applicable |
| Storage RLS path enforcement | ✅ | `avatars_write` policy — write path must start with `profiles/<auth.uid()>/` or `clinics/<owned-clinic>/` |
| Avatars bucket visibility | ✅ | Public (per `20260507130000_avatars_bucket_public.sql`) |
| Input sanitization before Supabase | ✅ | Glucose, BP, HR, HbA1c all validated; emissivity / reflected-temp clamped; ticket subject/body length-checked at the SQL level |
| No `console.log` with sensitive data | ✅ | Audited |
| `dbg()` guarded by `__DEV__` | ✅ | |
| Login lockout (5 attempts / 30 s) | ✅ | `store/authStore.ts` |
| Inactivity timeout | ✅ | `useInactivityTimeout` mounted at `app/_layout.tsx:14` |
| Deep link handler (password reset) | ✅ | `app/_layout.tsx:20-30` |
| Server-side admin role rejection on mobile | ✅ | Auth store signs out admin role on mobile login |
| Clinic approval gate on mobile login | ✅ | `pending`/`rejected` clinics signed out with a clear message; admin-only columns fenced by `clinics_block_non_admin_approval_change` trigger |
| Admin-only RPCs (`admin_approve_clinic`, `admin_reject_clinic`, `admin_resolve_ticket`) | ✅ | SECURITY DEFINER + `is_admin()` guard |
| Edge Function (`admin-set-clinic-password`) — caller verification | ✅ | Bearer JWT validated; `profiles.role='admin'` checked via service role BEFORE any privileged action |
| Edge Function — request-row sanity | ✅ | UUID validation; `clinic_profile_id` of the row must match the body's `profile_id`; row must still be `pending` |

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
| Foot isolation: hole fill + moat sampler + one-sided threshold + largest-component | ✅ | Replaces the previous closing-only / two-sided / all-outside-pixels approach |

---

## Summary

| Area | Status | Notes |
|---|---|---|
| Supabase schema (13 tables) | ✅ All verified | + `clinic_password_reset_requests`, `support_tickets`; `clinics.approval_status` and friends |
| Foreign keys (21 relationships) | ✅ All verified | |
| RLS enabled | ✅ All tables + storage buckets | |
| RLS INSERT WITH CHECK | ✅ All applicable | |
| Storage buckets | ✅ avatars (public), thermal-images / thermal-csv (private) | |
| RPCs | ✅ 10 verified | All names match consumer call sites |
| Edge Functions | ✅ 3 verified | `clinic-signup`, `auth-redirect`, `admin-set-clinic-password` |
| TypeScript types — core | ✅ All match DB | |
| TypeScript types — admin / config | ⚠️ Partial | `Clinic`, `Device`, `SystemConfig` missing from `types/index.ts` (low priority) |
| Local DB | ✅ Complete | expo-sqlite + AsyncStorage bundle store; sync flow working |
| Offline guest flow | ✅ Complete | Capture → patient details → bundleStorage → history → bundle detail |
| Auth & Security | ✅ All checks pass | Mobile + web admin, including the new clinic-approval gate and Edge-Function-mediated password reset |
| Native UVC pipeline | ✅ Complete | Full enhancement chain with Raw / Enhanced toggle |
