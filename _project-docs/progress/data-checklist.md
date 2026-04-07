# Data Layer Checklist
**Last verified:** 2026-04-07 (v0.9.1 full codebase QA audit)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Issue found

---

## Supabase Tables — Schema Match

| Table | Exists | Columns Match Schema | RLS Enabled | Notes |
|---|---|---|---|---|
| `profiles` | ✅ | ✅ | ✅ | FK to auth.users; profile created by `handle_new_user()` trigger |
| `clinics` | ✅ | ✅ | ✅ | |
| `patients` | ✅ | ✅ | ✅ | |
| `devices` | ✅ | ✅ | ✅ | |
| `screening_sessions` | ✅ | ✅ | ✅ | |
| `thermal_captures` | ✅ | ✅ | ✅ | |
| `patient_vitals` | ✅ | ✅ | ✅ | |
| `classification_results` | ✅ | ✅ | ✅ | |
| `system_config` | ✅ | ✅ | ✅ | key TEXT PK, value JSONB, updated_at TIMESTAMPTZ. Admin-only RLS. Seeded: maintenance_mode=false, audit_log_enabled=true |
| `data_requests` | ✅ | ✅ | ✅ | Offline sync request table: from_id, to_id, status (pending/accepted/rejected), session data |

---

## Foreign Keys — All Verified ✅

| Table | Column | References |
|---|---|---|
| `profiles` | `clinic_id` | → `clinics.id` |
| `patients` | `user_id` | → `profiles.id` |
| `patients` | `clinic_id` | → `clinics.id` |
| `devices` | `clinic_id` | → `clinics.id` |
| `screening_sessions` | `patient_id` | → `patients.id` |
| `screening_sessions` | `operator_id` | → `profiles.id` |
| `screening_sessions` | `device_id` | → `devices.id` |
| `screening_sessions` | `clinic_id` | → `clinics.id` |
| `thermal_captures` | `session_id` | → `screening_sessions.id` |
| `patient_vitals` | `session_id` | → `screening_sessions.id` |
| `classification_results` | `session_id` | → `screening_sessions.id` |
| `data_requests` | `from_id` | → `profiles.id` |
| `data_requests` | `to_id` | → `profiles.id` |

---

## RLS Policies — Per Table

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|---|
| `profiles` | ✅ self + clinic same-clinic + admin | ✅ via trigger (handle_new_user) | ✅ self + clinic + admin | ❌ none | No direct client INSERT — created by Supabase trigger |
| `clinics` | ✅ anon reads active + clinic reads own + admin | ❌ none (admin dashboard only) | ✅ clinic + admin | ❌ none | |
| `patients` | ✅ self + clinic + admin | ✅ WITH CHECK: clinic_id = get_my_clinic_id() | ✅ clinic + admin | ❌ none | |
| `devices` | ✅ clinic + admin | ✅ WITH CHECK: clinic_id = get_my_clinic_id() | ✅ clinic + admin | ❌ none | |
| `screening_sessions` | ✅ patient + clinic + admin | ✅ WITH CHECK: clinic_id = get_my_clinic_id() | ✅ clinic + admin | ❌ none | |
| `thermal_captures` | ✅ patient + clinic + admin | ✅ WITH CHECK: session_id in own clinic | ❌ none | ❌ none | |
| `patient_vitals` | ✅ patient + clinic + admin | ✅ WITH CHECK: session_id in own clinic | ✅ clinic + admin | ❌ none | |
| `classification_results` | ✅ patient + clinic + admin | ✅ WITH CHECK: session_id in own clinic | ❌ none | ❌ none | |
| `system_config` | ✅ admin only | ✅ admin only | ✅ admin only | ✅ admin only | Added 2026-03-21 |
| `data_requests` | ✅ from_id or to_id | ✅ clinic inserts request | ✅ to_id (patient) updates status | ❌ none | |

> **Note:** All INSERT policies verified — WITH CHECK clauses present on all applicable tables.

---

## TypeScript Types vs Actual DB Columns

| Type | Status | Notes |
|---|---|---|
| `AuthUser` | ✅ | Includes `phone`, `created_at`, `updated_at` |
| `ScreeningSession` | ✅ | Includes `app_version` |
| `PatientVitals` | ✅ | Includes `id`, `session_id`, `recorded_at` |
| `ThermalCapture` | ✅ | Includes `resolution_x`, `resolution_y` |
| `ClassificationResult` | ✅ | Includes `feature_vector`, `risk_level?: "LOW" \| "MEDIUM" \| "HIGH"` |
| `Patient` | ✅ | Full schema match |
| `LocalCapture` | ✅ | SQLite offline capture type; includes `synced_at`, `supabase_session_id` |
| `DataRequest` | ✅ | Offline sync request type |
| `BLEDevice` | ✅ | `{ id, name, rssi }` — used by deviceStore |
| `CameraSource` | ✅ | `"uvc" \| "wifi"` — added v0.8.0 |
| `Clinic` | ❌ | Not in `types/index.ts` — only a local `interface` in admin screens |
| `Device` | ❌ | Not in `types/index.ts` — only a local `interface` in admin/pairing screens |
| `SystemConfig` | ❌ | No TypeScript type for `system_config` table rows |

---

## Local DB — expo-sqlite (Offline-First)

| Task | Status | Notes |
|---|---|---|
| expo-sqlite installed | ✅ | v16.0.10 — bare workflow compatible |
| Database migration | ✅ | `lib/db/localDb.ts` — `getDb()`, `migrate()` (schema v1), `generateLocalId()` |
| `local_captures` table | ✅ | `lib/db/offlineCaptures.ts` — all CRUD operations |
| `saveCapture()` | ✅ | Saves matrix B64 + vitals + patient label to SQLite |
| `getUnsyncedCaptures()` | ✅ | Returns all rows where synced=0 |
| `markSynced()` | ✅ | Sets synced=1 + supabase_session_id + synced_at; guards against double-mark |
| `deleteCapture()` | ✅ | Implemented but not surfaced in UI (suggestion for v1.0) |
| Sync logic (local → Supabase) | ✅ | `app/(clinic)/sync.tsx` — full upload flow: parse matrix → insert screening_session + thermal_captures + patient_vitals → data_request → markSynced |
| Patient accept/reject | ✅ | `app/(patient)/sync.tsx` — updates data_request status |
| Matrix format compatibility | ✅ | `parseStoredMatrix()` auto-detects Y16 B64 vs JSON-encoded CSV matrix (v0.9.1) |

> **WatermelonDB removed** — replaced with expo-sqlite v16 in v0.6.0. `lib/database/` folder retained but unused; node_modules still contains stale WatermelonDB files (run `npm install` to clear).

---

## Auth & Security

| Item | Status | Notes |
|---|---|---|
| Supabase anon key only on client | ✅ | No service_role key in client code |
| EXPO_PUBLIC_ env var prefix | ✅ | URL and anon key use correct prefix |
| Auth session via Supabase | ✅ | signInWithPassword, onAuthStateChange, JWT-based cold start |
| RLS enabled on all tables | ✅ | All 10 tables verified |
| INSERT WITH CHECK clauses | ✅ | All applicable INSERT policies verified |
| Input sanitization before Supabase | ✅ | Blood glucose, BP, heart rate, HbA1c all validated |
| No console.log with sensitive data | ✅ | Audited — no sensitive data in console calls |
| `dbg()` guarded by `__DEV__` | ✅ | Fixed 2026-03-30 |

---

## Summary

| Area | Status | Notes |
|---|---|---|
| Supabase schema (10 tables) | ✅ All verified | Includes data_requests table |
| Foreign keys (13 relationships) | ✅ All verified | |
| RLS enabled | ✅ All tables | |
| RLS INSERT WITH CHECK | ✅ All applicable | |
| TypeScript types — core | ✅ All match DB | |
| TypeScript types — admin | ⚠️ Partial | `Clinic`, `Device`, `SystemConfig` missing from types/index.ts (low priority) |
| Local DB (expo-sqlite) | ✅ Complete | Full offline capture → sync flow working |
| Auth & Security | ✅ All checks pass | |
