# Data Layer Checklist
**Last verified:** 2026-03-21 (full codebase scan v2 + live Supabase db-sync)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Issue found

---

## Supabase Tables — Schema Match

| Table | Exists | Columns Match Schema | RLS Enabled | Notes |
|---|---|---|---|---|
| `profiles` | ✅ | ✅ | ✅ | FK to auth.users exists but not visible via public schema query (expected) |
| `clinics` | ✅ | ✅ | ✅ | |
| `patients` | ✅ | ✅ | ✅ | |
| `devices` | ✅ | ✅ | ✅ | |
| `screening_sessions` | ✅ | ✅ | ✅ | |
| `thermal_captures` | ✅ | ✅ | ✅ | |
| `patient_vitals` | ✅ | ✅ | ✅ | |
| `classification_results` | ✅ | ✅ | ✅ | |
| `system_config` | ✅ | ✅ | ✅ | Added 2026-03-21. key TEXT PK, value JSONB, updated_at TIMESTAMPTZ. Admin-only RLS. Seeded: maintenance_mode=false, audit_log_enabled=true |

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

---

## RLS Policies — Per Table

| Table | SELECT | INSERT | UPDATE | DELETE | Issues |
|---|---|---|---|---|---|
| `profiles` | ✅ self + clinic same-clinic + admin | ✅ admin ALL policy + trigger handles new users | ✅ self + clinic same-clinic + admin | ❌ none | No direct client INSERT needed — profiles created by handle_new_user() trigger |
| `clinics` | ✅ anon reads active + clinic reads own + admin | ❌ none | ✅ clinic updates own + admin | ❌ none | Clinics created via admin dashboard, not client |
| `patients` | ✅ self + clinic reads own + admin | ✅ WITH CHECK: clinic_id = get_my_clinic_id() | ✅ clinic updates own + admin | ❌ none | |
| `devices` | ✅ clinic reads own + admin | ✅ WITH CHECK: clinic_id = get_my_clinic_id() | ✅ clinic updates own + admin | ❌ none | |
| `screening_sessions` | ✅ patient reads own + clinic reads own + admin | ✅ WITH CHECK: clinic_id = get_my_clinic_id() | ✅ clinic updates own + admin | ❌ none | |
| `thermal_captures` | ✅ patient reads own + clinic reads own + admin | ✅ WITH CHECK: session_id in own clinic | ❌ none | ❌ none | |
| `patient_vitals` | ✅ patient reads own + clinic reads own + admin | ✅ WITH CHECK: session_id in own clinic | ✅ clinic updates own + admin | ❌ none | |
| `classification_results` | ✅ patient reads own + clinic reads own + admin | ✅ WITH CHECK: session_id in own clinic | ❌ none | ❌ none | |
| `system_config` | ✅ admin only | ✅ admin only | ✅ admin only | ✅ admin only | Added 2026-03-21 |

> **Note:** All INSERT policies verified 2026-03-20 — WITH CHECK clauses present on all 6 applicable tables.

---

## TypeScript Types vs Actual DB Columns

| Type | Status | Notes |
|---|---|---|
| `AuthUser` | ✅ | Includes `phone`, `created_at`, `updated_at` |
| `ScreeningSession` | ✅ | Includes `app_version` |
| `PatientVitals` | ✅ | Includes `id`, `session_id`, `recorded_at` |
| `ThermalCapture` | ✅ | Includes `resolution_x`, `resolution_y` |
| `ClassificationResult` | ✅ | Includes `feature_vector` |
| `Patient` | ✅ | Verified present in `types/index.ts` |
| `Clinic` | ✅ | Verified present in `types/index.ts` |
| `Device` | ✅ | Verified present in `types/index.ts` |
| `BLEDevice` | ✅ | `{ id, name, rssi }` — used by deviceStore |
| `SystemConfig` | ❌ | No TypeScript type defined for `system_config` table rows |

---

## Local DB (WatermelonDB) — Offline-First

| Task | Status | Notes |
|---|---|---|
| WatermelonDB installed | ✅ | v0.28.0 + @nozbe/with-observables |
| expo-sqlite installed | ✅ | For future native adapter switch |
| babel.config.js created | ✅ | Decorator support enabled |
| Local schema defined | ✅ | `lib/database/schema.ts` — 4 tables |
| Patient model | ✅ | `lib/database/models/Patient.ts` |
| ScreeningSession model | ✅ | `lib/database/models/ScreeningSession.ts` |
| ThermalCapture model | ✅ | `lib/database/models/ThermalCapture.ts` |
| PatientVitals model | ✅ | `lib/database/models/PatientVitals.ts` |
| Database instance | ✅ | `lib/database/index.ts` — LokiJS adapter |
| Sync logic (local → Supabase) | ❌ | Not started |
| Offline capture queue | ❌ | Not started |
| Conflict resolution strategy | ❌ | Not designed yet |

> **Adapter note:** Currently using LokiJS (works in Expo Go). Switch to SQLiteAdapter when building a native development build for production.

---

## Auth & Security

| Item | Status | Notes |
|---|---|---|
| Supabase anon key only on client | ✅ | No service_role key in client code |
| EXPO_PUBLIC_ env var prefix | ✅ | Both URL and anon key correct |
| Auth session via Supabase | ✅ | signInWithPassword, getSession, onAuthStateChange |
| RLS enabled on all tables | ✅ | Verified via db-sync — all 9 tables |
| INSERT WITH CHECK clauses | ✅ | All applicable INSERT policies verified |
| Input sanitization before Supabase | 🔄 | Blood glucose and BP ranges validated. Heart rate and HbA1c have no range check (SEC-03) |
| No console.log with sensitive data | ✅ | Audited — no sensitive data in console calls |

---

## Summary

- Supabase schema: ✅ all 9 tables (8 core + system_config) verified
- Foreign keys: ✅ all 11 relationships verified
- RLS enabled: ✅ all tables
- RLS INSERT policies: ✅ all WITH CHECK clauses verified 2026-03-20
- TypeScript types: ✅ all core types match DB schema — `SystemConfig` type missing (low priority)
- WatermelonDB: ✅ installed + schema + models + database instance — sync logic not started (deferred)
