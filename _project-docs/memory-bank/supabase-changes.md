# Supabase Changes Log — Vestigia

---
## [2026-05-03 — v0.12.0] — Move angiosome data to classification_results
**Type:** Schema change
**Tables affected:** `thermal_captures`, `classification_results`

### What was done
The DPN classifier's per-angiosome statistics live entirely on the analysis side. They were previously scaffolded as columns on `thermal_captures` (where they were never populated, since the FLIR camera produces only raw temperatures, not Hernandez-Contreras region means). Moved everything onto `classification_results` in two migrations.

### SQL executed
```sql
-- migration: move_angiosome_data_to_classification_results
alter table public.thermal_captures
  drop column if exists mpa_mean_c,
  drop column if exists lpa_mean_c,
  drop column if exists mca_mean_c,
  drop column if exists lca_mean_c;

alter table public.classification_results
  add column if not exists left_regions          jsonb,
  add column if not exists right_regions         jsonb,
  add column if not exists mean_asymmetry        numeric,
  add column if not exists max_asymmetry         numeric,
  add column if not exists left_foot_mean_temp_c numeric,
  add column if not exists right_foot_mean_temp_c numeric;

comment on column public.classification_results.left_regions is
  'Per-angiosome mean temperatures (degC) for the left foot: {MPA, LPA, MCA, LCA}';
comment on column public.classification_results.right_regions is
  'Per-angiosome mean temperatures (degC) for the right foot: {MPA, LPA, MCA, LCA}';
comment on column public.classification_results.per_angiosome_asymmetry is
  'Per-angiosome absolute |L-R| temperature differences (degC): {MPA, LPA, MCA, LCA}';

-- migration: drop_redundant_max_asymmetry
-- max_asymmetry_c already covers the maximum Δ in degC; drop the new dup.
alter table public.classification_results
  drop column if exists max_asymmetry;
```

### Why
- Captures are raw camera output. Angiosome means are derived only by the API (`/predict/patient/mobile` returns `FootResult.regions`), so leaving null columns on `thermal_captures` was just noise.
- `classification_results` is now the single source of truth for everything the classifier returns. The mobile client persists the full response shape there: per-foot regions, per-angiosome asymmetry, mean/max Δ°C, and per-foot mean temps.

### Result
Both migrations applied via MCP `apply_migration`. Confirmed via `information_schema.columns`: `thermal_captures` no longer exposes the four region columns; `classification_results` now carries `left_regions`, `right_regions`, `mean_asymmetry`, `left_foot_mean_temp_c`, `right_foot_mean_temp_c`. `max_asymmetry_c` and `per_angiosome_asymmetry` retained.

---
## [2026-05-03 — v0.11.0] — PSGC seed + clinic-signup Edge Function

**Type:** Reference data + RLS amendment + Edge Function
**Tables / functions:** `ph_regions`, `ph_provinces`, `ph_cities`, `ph_barangays`, edge function `clinic-signup`

### What was done
1. **PSGC seed.** Loaded the Philippine Standard Geographic Code:
   - 17 regions, 81 provinces, 1634 cities/municipalities, 42046 barangays
   - 5 migration files committed under [supabase/migrations/](../../supabase/migrations/) (`20260502120500_psgc_alter_and_top.sql` + `_psgc_cities` + 3 barangay parts)
   - Live seed loaded via [scripts/seed-psgc.mjs](../../scripts/seed-psgc.mjs) using the anon key with RLS temporarily disabled on `ph_cities` and `ph_barangays`. RLS re-enabled after.
   - Seed migrations themselves are idempotent (`ON CONFLICT (code) DO NOTHING`); a fresh `supabase db push` will replay them.
2. **PSGC anonymous read.** Migration `20260503120000_psgc_anon_read.sql` replaces the `TO authenticated` SELECT policies with `TO anon, authenticated` so the clinic signup pickers populate before the user is signed in. Reference data is non-sensitive (administrative codes only).
3. **`clinic-signup` Edge Function** deployed.
   - File: [supabase/functions/clinic-signup/index.ts](../../supabase/functions/clinic-signup/index.ts)
   - `verify_jwt = false` (the caller is an unauthenticated signup; the function does its own validation).
   - With the service role: `auth.admin.createUser({ email_confirm: true })` → `INSERT clinics` → `UPDATE profiles.clinic_id`.
   - Rolls back the auth user / clinic if any step fails.
   - On success the mobile `registerClinic` action auto-signs-in with the same credentials.

### Pending follow-ups
- ZIP per-barangay overrides for Manila / QC / Cebu (deferred until needed).
- `finalize-session` and `promote-session` Edge Functions (deferred until the capture flow rewrite).
- The clinic profile screen now reads `facility_name`; other screens (`history`, etc.) still reference the pre-redesign schema columns and will need a sweep.

---
## [2026-05-02 — v0.10.0] — Schema Rollout (full new schema)

**Type:** Schema Bootstrap + Triggers + RLS + Storage + Seed
**Tables affected:** all (fresh creation)

### What was done
Applied 5 migrations against the empty `public` schema (post-v0.9.10 reset). Migrations are also committed under [supabase/migrations/](../../supabase/migrations/) for reproducibility.

| File | Scope |
| --- | --- |
| `20260502120000_schema_bootstrap.sql` | 8 enums, 4 PSGC reference tables (empty), 10 core tables, indexes |
| `20260502120100_triggers_and_code_generators.sql` | `set_updated_at`, `gen_patient_code`, `gen_clinic_code`, `handle_new_user` |
| `20260502120200_rls_policies.sql` | RLS on all tables + 38 policies + helper functions (`auth_role`, `auth_clinic_id`, `is_admin`) |
| `20260502120300_storage_buckets.sql` | `avatars`, `thermal-images`, `thermal-csv` (private) + storage.objects policies |
| `20260502120400_seed_admin_account.sql` | Single admin user + identity row |

### Key design notes
- **Dual identity on sessions:** `screening_sessions.subject_profile_id` (patient view) and `clinic_id` (clinic view) are independent. Either or both can be filled; the same row surfaces in both histories.
- **No anonymous patients:** `patients.profile_id` is `NOT NULL`. Every clinic-managed record links to a registered profile.
- **Code generators:** patient_code = `XXX-YYYYMMDD-HHMM-NN` (initials + creation timestamp + race-safe counter); clinic_code = `XX-YYYYMMDD-HHMM-NN` (facility-type prefix).
- **Helper RLS functions are SECURITY DEFINER:** they read `profiles` without re-entering RLS, avoiding recursion.

### Surprises during apply
1. **Duplicate handle_new_user trigger.** The v0.9.10 schema reset only dropped public tables — it left a `trg_on_auth_user_created` trigger on `auth.users` from an earlier setup. After my migration added `on_auth_user_created`, both fired and the profile insert collided on PK. Fix: `DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;` baked into the seed migration (idempotent).
2. **`auth.identities.email` is a generated column** in current Supabase. Don't include it in `INSERT`; it's derived from `identity_data->>'email'`.

### Result
- 14 public tables, 38 RLS policies, 7 triggers (4 updated_at + 2 code generators + 1 handle_new_user), 3 storage buckets with 6 policies, 1 seeded admin.
- Login on mobile must reject `role='admin'` after profile fetch.
- PSGC/ZIP seeds and Edge Functions deferred.

### Pending follow-ups
- Bundle PSGC + ZIP seed data when clinic signup is wired
- Build Edge Functions: `clinic-signup` (auto-confirmed signup), `finalize-session` (atomic capture upload), `promote-session` (link offline-guest captures to a patient/clinic)
- Verify the existing `auth.users` triggers (`RI_ConstraintTrigger_*`) don't reference deleted tables — quick cleanup pass after schema stabilizes

---
## [2026-05-02 — v0.9.10] — Schema Reset (start from scratch)

**Type:** Schema Change (DROP)
**Table(s) affected:** `profiles`, `clinics`, `patients`, `devices`, `screening_sessions`, `thermal_captures`, `classification_results`

### What was done
User requested a full schema reset before redesigning the data model. All seven public tables were empty (0 rows) at the time of drop.

### SQL executed
```sql
DROP TABLE IF EXISTS public.classification_results CASCADE;
DROP TABLE IF EXISTS public.thermal_captures CASCADE;
DROP TABLE IF EXISTS public.screening_sessions CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.clinics CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
```

### Why
Codebase audit revealed the existing schema was outgrown by feature changes (bilateral capture, bundle storage, role expansion). User chose to wipe and redesign rather than migrate. New schema TBD in a follow-up planning round.

### Result
Success. `list_tables` on `public` returns `[]`. Storage bucket `thermal-images` and any related RLS policies were NOT touched — verify separately when redesigning.

### Pending
- Redesign and re-create schema (separate planning round)
- Re-create RLS policies
- Re-create `handle_new_user()` trigger
- Re-verify `thermal-images` storage bucket + policies after schema rebuild

---
## [2026-04-08 — v0.9.5] — Thermal Image Storage: thermal_captures.image_url + thermal-images bucket

**Type:** Schema Change + Storage Bucket + RLS Policies
**Table(s) affected:** `thermal_captures`, `storage.buckets`, `storage.objects`

### What was done
Added support for saving thermal PNG images to Supabase Storage alongside the matrix data.
- Added `image_url TEXT` (nullable) column to `thermal_captures`
- Created `thermal-images` private Storage bucket
- Added RLS policies: authenticated users can upload and read objects in the bucket

### SQL executed
```sql
ALTER TABLE thermal_captures ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thermal-images', 'thermal-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload thermal images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'thermal-images');

CREATE POLICY "Authenticated users can read thermal images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'thermal-images');
```

### Why
The DPN API already receives Base64 PNG images per foot. This change archives those same PNGs in Supabase Storage so each `thermal_captures` row has a retrievable image reference. Path format: `{session_id}/{foot}.png`.

### Result
Column and bucket confirmed via MCP query. `image_url` is nullable — upload failure is non-fatal and will not block session creation.

---
## [2026-04-07 — v0.9.2] — Avatar Support: profiles.avatar_url + avatars Storage bucket

**Type:** Schema Change + Storage Bucket + RLS Policies
**Table(s) affected:** `profiles`, `storage.buckets`, `storage.objects`

### What was done
Added avatar photo support for clinic and patient profiles.

### SQL executed
```sql
-- 1. Add avatar_url column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create public Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Why
Profile screens for clinic and patient operators needed avatar photo support. Avatars stored at `avatars/{user_id}/avatar.jpg` — the folder name is the user's UUID, which the RLS policies use to enforce owner-only write access while allowing public read (URLs are safe to embed in the app).

### Result
- ✅ `profiles.avatar_url TEXT` column confirmed present (MCP verified)
- ✅ `avatars` bucket confirmed (public=true, MCP verified)
- ✅ All 4 RLS policies confirmed (MCP verified via pg_policies)
- Requires `npx expo run:android` rebuild for `expo-image-picker` native module to function

---
## [2026-04-05 — v0.6.0] — Offline Sync: data_requests + screening_sessions writes from clinic sync screen

**Type:** Application Query Wiring (new table: `data_requests`; new writes to `screening_sessions`, `thermal_captures`, `patient_vitals`)
**Table(s) affected:** `data_requests`, `screening_sessions`, `thermal_captures`, `patient_vitals`

### What was done
Verified `data_requests` table existence and schema via MCP. New client-side writes added for the offline sync flow:

1. **Clinic sync screen** (`app/(clinic)/sync.tsx`):
   - INSERT into `screening_sessions` (status=completed, started_at from local capture timestamp)
   - INSERT into `thermal_captures` (parsed 160×120 matrix from B64, foot, temp stats, resolution 160×120)
   - INSERT into `patient_vitals` (if blood_glucose/BP recorded offline — optional)
   - INSERT into `data_requests` (from_role=clinic, from_id=operator id, to_id=patient user_id, status=pending)

2. **Patient sync screen** (`app/(patient)/sync.tsx`):
   - SELECT `data_requests` WHERE to_id=user.id AND status=pending (with session + clinic join)
   - UPDATE `data_requests` SET status=accepted / status=rejected

### SQL patterns used
```sql
-- Verify data_requests table
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'data_requests';

-- Clinic: create session from offline capture
INSERT INTO screening_sessions (patient_id, operator_id, device_id, clinic_id, status, started_at, completed_at)
VALUES (...);

-- Clinic: save thermal capture (offline matrix)
INSERT INTO thermal_captures (session_id, foot, thermal_matrix, min_temp_c, max_temp_c, mean_temp_c, resolution_x, resolution_y, captured_at)
VALUES (...);

-- Clinic: send data request to patient
INSERT INTO data_requests (from_role, from_id, to_role, to_id, session_id, status)
VALUES ('clinic', $operator_id, 'patient', $patient_user_id, $session_id, 'pending');

-- Patient: fetch pending requests
SELECT id, from_id, session_id, created_at,
  screening_sessions(id, started_at, status, clinics(name), thermal_captures(foot, min_temp_c, max_temp_c))
FROM data_requests
WHERE to_id = $user_id AND status = 'pending';

-- Patient: accept or reject
UPDATE data_requests SET status = 'accepted' WHERE id = $request_id;
UPDATE data_requests SET status = 'rejected' WHERE id = $request_id;
```

### Why
Offline-first feature: clinic captures without internet → saves locally → syncs to Supabase → notifies patient → patient accepts or rejects the session record.

### Result
All queries working. `data_requests` table confirmed present with correct schema (8 columns). Clinic sync and patient accept/reject fully wired.

---
## [2026-03-21 — v0.5.0] — Backend Wiring: 8 Screens Wired to Supabase

**Type:** Application Query Wiring (no schema changes — reads/writes to existing tables)
**Table(s) affected:** `classification_results`, `screening_sessions`, `profiles`, `clinics`, `devices`, `patient_vitals`, `thermal_captures`

### What was done
Wired all remaining screens from mock data to real Supabase queries. No schema changes — only new client-side `.select()`, `.insert()`, and `.update()` calls.

- `classification_results` — assessment screen now inserts result row after "Save to Cloud"; also updates `screening_sessions.status = "completed"` + `completed_at`
- `screening_sessions` — history screen now queries by `clinic_id`; session detail screens join to get full session data
- `profiles` — admin users screen queries all profiles; `.update({ is_active })` for Activate/Deactivate
- `clinics` + `devices` — admin clinics screen queries clinics with joined devices; `.update({ is_active })` for Activate/Deactivate
- `clinics` — clinic home dashboard fetches real clinic name by `id`
- `screening_sessions` — clinic home fetches today's session count + positive/negative breakdown by `clinic_id` + `started_at >= today`

### SQL patterns used
```sql
-- History: fetch sessions for clinic
SELECT id, started_at, status, classification_results(classification, confidence_score)
FROM screening_sessions
WHERE clinic_id = $1
ORDER BY started_at DESC;

-- Assessment: insert classification result
INSERT INTO classification_results (session_id, classification, confidence_score, ...)
VALUES (...);

-- Assessment: update session status
UPDATE screening_sessions SET status = 'completed', completed_at = NOW()
WHERE id = $1;

-- Admin: activate/deactivate user
UPDATE profiles SET is_active = $1 WHERE id = $2;

-- Admin: activate/deactivate clinic
UPDATE clinics SET is_active = $1 WHERE id = $2;
```

### Why
All these screens were displaying mock data. Wired to real DB for thesis demo readiness.

### Result
All 8 screens now read/write real data. No schema changes needed — existing tables + RLS covered all cases.

---
## [2026-03-20 00:00] — MCP Connection Established + Schema Discovery

**Type:** SQL Query (read-only)
**Table(s) affected:** All public tables

### What was done
Connected Claude Code to Supabase via MCP (postgres stdio server using pooler URL).
Ran initial schema discovery query.

### SQL executed
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Why
To establish MCP access for development and discover the existing database structure.

### Result
Successfully connected. 8 tables found:
- `classification_results`
- `clinics`
- `devices`
- `patient_vitals`
- `patients`
- `profiles`
- `screening_sessions`
- `thermal_captures`

---

## [2026-03-20 00:01] — Full Schema + RLS + FK Audit (db-sync)
**Type:** SQL Query (read-only)
**Table(s) affected:** All public tables

### What was done
Full db-sync audit: queried all column definitions, RLS status, RLS policies, and foreign key relationships across all 8 tables.

### SQL executed
```sql
-- Columns
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- RLS status
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND relkind = 'r';

-- RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Foreign keys
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
```

### Why
To verify the live database matches the thesis schema (schema.md), confirm RLS is active, and identify any security gaps before wiring the app to real data.

### Result
- ✅ All 8 tables match thesis schema exactly
- ✅ RLS enabled on all 8 tables
- ✅ All 11 foreign key relationships verified
- ✅ All 6 INSERT policies verified correct — WITH CHECK clauses present on all (prior audit note was incorrect; a re-verification query confirmed this)
- ⚠️ 4 TypeScript types missing fields vs actual DB columns (fixed separately in types/index.ts)
- No schema changes made — read-only audit

---

## [2026-03-20 01:00] — Email Confirmation Redirect URL (Auth Config Change)

**Type:** Auth Configuration (app-side + Supabase dashboard)
**Table(s) affected:** `auth.users` (Supabase managed)

### What was done
Changed `emailRedirectTo` in `supabase.auth.signUp()` from `vestigia://confirm` (direct deep link) to the Edge Function URL:
```
https://[project-ref].supabase.co/functions/v1/auth-redirect
```

Also created `supabase/functions/auth-redirect/index.ts` — a Deno Edge Function that serves a Vestigia-themed HTML page handling both mobile (auto-opens app) and desktop (shows "use your phone" message) cases.

### Why
Direct deep links (`vestigia://`) only work on devices with the app installed. Clicking the confirmation link on a PC would show a browser error. The Edge Function acts as a smart redirect middleman.

### Result
- App code change: done
- Edge Function file: created (`supabase/functions/auth-redirect/index.ts`)
- **Pending:** Deploy Edge Function with `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`
- **Pending:** Add Edge Function URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

---
