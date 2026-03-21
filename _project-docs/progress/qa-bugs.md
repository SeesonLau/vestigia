# QA Report — Bugs, Stubs & Issues
**Last verified:** 2026-03-21 (Full codebase QA audit — 51 source files reviewed)

---

## Critical — Blocks Real Usage

| ID | File | Issue | Impact |
|---|---|---|---|
| ~~BUG-01~~ | `app/(clinic)/pairing.tsx` | ✅ Fixed 2026-03-20 — navigates to `/(clinic)/live-feed` | |
| ~~BUG-02~~ | `app/(clinic)/live-feed.tsx` | ✅ Fixed 2026-03-20 — navigates to `/(clinic)/clinical-data` | |
| ~~BUG-03~~ | `app/(clinic)/clinical-data.tsx` | ✅ Fixed 2026-03-20 — navigates to `/(clinic)/assessment` after submit; Cancel returns to home | |
| ~~BUG-04~~ | All roles | ✅ Fixed 2026-03-21 — `hooks/useInactivityTimeout.ts` created. 30-min timer resets on any touch via root `View.onTouchStart`. AppState listener logs out if app was backgrounded ≥30 min. Wired in `app/_layout.tsx`. | |
| BUG-05 | `app/(clinic)/live-feed.tsx:148–165` | Foot selector buttons (Left / Right / Bilateral) have no `onPress` handler. The active style is hardcoded to "Bilateral". Tapping Left or Right has no effect — `selectedFoot` is always `"bilateral"` at capture. | Capture foot metadata is always wrong; thermal capture saved with incorrect foot value |

---

## High — Feature Gaps

| ID | File | Issue | Impact |
|---|---|---|---|
| GAP-01 | `store/deviceStore.ts` | BLE scan is mock — no `react-native-ble-plx` or equivalent | FR-201, FR-202 not met |
| GAP-02 | `store/deviceStore.ts` | Wi-Fi WebSocket to `192.168.4.1:3333` not implemented | FR-203 not met |
| GAP-03 | `store/thermalStore.ts` | Thermal frames from mock `setInterval`, not hardware | FR-301 not met |
| GAP-04 | `app/(clinic)/assessment.tsx` | AI classification result is hardcoded mock, no cloud polling | FR-503, FR-504 not met |
| ~~GAP-05~~ | `app/(clinic)/clinical-data.tsx` | ✅ Fixed 2026-03-21 — submit writes `screening_sessions`, `patient_vitals`, `thermal_captures` to Supabase. Added `patient-select.tsx` screen. sessionStore extended with `selectedPatient` + `clearSession`. Cancel clears session state. | |
| GAP-06 | Entire app | WatermelonDB not installed — no offline support | FR-505 not met |
| GAP-07 | `app/(clinic)/assessment.tsx` | "Save to Cloud ↑" button calls `setSaved(true)` only — does NOT write to `classification_results` table | FR-604 not met; result is never persisted |
| GAP-08 | `app/(clinic)/assessment.tsx` | No abnormal region overlay on thermal map | FR-603 partial |
| GAP-09 | `app/(clinic)/history.tsx` | Reads `MOCK_CLINIC_SESSIONS` from `data/mockData` — real Supabase sessions are never shown | Clinic operator always sees demo data in history |
| GAP-10 | `app/(admin)/users.tsx` | Reads `MOCK_ALL_USERS` — not wired to `profiles` table | Admin sees hardcoded mock users, not real accounts |
| GAP-11 | `app/(admin)/clinics.tsx` | Reads `MOCK_CLINICS` + `MOCK_DEVICES` — not wired to `clinics` + `devices` tables | Admin sees hardcoded mock clinics, not real database |

---

## Medium — Incomplete UI / UX

| ID | File | Issue | Impact |
|---|---|---|---|
| ~~UX-01~~ | `app/(clinic)/index.tsx` | ✅ Fixed 2026-03-21 — all 4 buttons wired: Pair Device→pairing, New Screening→patient-select, Session History→history, Settings→settings. Ionicons replaced emojis. | |
| ~~UX-02~~ | `app/(patient)/index.tsx` | ✅ Fixed — session card `onPress` navigates to `/(patient)/session/[id]` | |
| ~~UX-03~~ | `app/(admin)/index.tsx` | ✅ Fixed — "+ Invite User" → users, "+ Add Clinic" → clinics, "Configure Model Settings" → settings, Export buttons → Coming Soon alerts | |
| ~~UX-04~~ | `app/(clinic)/settings.tsx` | ✅ Fixed 2026-03-21 — all handlers wired: Sign Out (with confirm), Change Password → update-password, Paired Device/Scan → pairing, Clear Cache (destructive confirm), Delete Account (destructive confirm). Emojis replaced with Ionicons. Version updated to 0.3.0. | |
| ~~UX-05~~ | `app/(patient)/settings.tsx` | ✅ Fixed 2026-03-20 — proper settings screen with Sign Out, Change Password, etc. | |
| ~~UX-06~~ | `app/(admin)/settings.tsx` | ✅ Fixed 2026-03-21 — Sign Out wired with confirmation dialog, Change Password → update-password, all stub onPress handlers → Alert "Coming Soon". Emojis replaced with Ionicons. Version updated to 0.3.0. | |
| UX-07 | `app/(patient)/session/[id].tsx` + `app/(clinic)/session/[id].tsx` | Both session detail screens read from `MOCK_CLINIC_SESSIONS`. Real sessions created via GAP-05 will return "Session not found." | Patient and clinic operators cannot view any real session they've created |
| UX-08 | `app/(admin)/users.tsx` + `app/(admin)/clinics.tsx` | "Deactivate/Activate Account" and "Deactivate/Activate Clinic" modal action buttons call `setSelected(null)` only — no Supabase update | Admin cannot actually change account or clinic status |

---

## Auth Issues (All Fixed 2026-03-20)

| ID | File | Issue | Status |
|---|---|---|---|
| ~~AUTH-01~~ | `authStore.ts` | ✅ Fixed — `resetPasswordForEmail` includes `redirectTo: 'vestigia://update-password'` | |
| ~~AUTH-02~~ | `(auth)/` | ✅ Fixed — `update-password.tsx` created | |
| ~~AUTH-03~~ | `_layout.tsx` | ✅ Fixed — deep link handler added for password reset and email confirmation | |
| ~~AUTH-04~~ | `register.tsx` | ✅ Fixed — password validation shows all failing rules at once | |
| ~~AUTH-05~~ | `authStore.ts` | ✅ Fixed — mock accounts fully removed | |
| ~~AUTH-06~~ | `authStore.ts` | ✅ Fixed — 5 failed login attempts triggers 30s client-side lockout | |
| ~~AUTH-07~~ | — | ✅ By design — admin accounts created via Supabase dashboard only | |
| ~~AUTH-08~~ | `login.tsx` | ✅ Fixed — login no longer rejects valid passwords under 8 chars | |
| ~~AUTH-09~~ | `login.tsx`, `register.tsx` | ✅ Fixed — unknown role falls back to login instead of silent freeze | |
| ~~AUTH-10~~ | `register.tsx` | ✅ Fixed — `selectedClinicId` resets when role is switched | |
| ~~AUTH-11~~ | `update-password.tsx` | ✅ Fixed — session guard on mount; form disabled if no valid reset token | |
| ~~AUTH-12~~ | `_layout.tsx` | ✅ Fixed — deep link handler narrowed to `vestigia://update-password` + `access_token` | |
| ~~AUTH-13~~ | `authStore.ts` | ✅ Fixed — `onAuthStateChange` subscription stored and cleaned up on re-init | |
| ~~AUTH-14~~ | `authStore.ts` | ✅ Fixed — `pendingClinicId` only stored for clinic role; `logout()` uses `try-finally` | |
| ~~AUTH-15~~ | `authStore.ts` | ✅ Fixed — `PGRST116` (no profile row) mapped to friendly error message | |

---

## Low — Code Quality / Compliance

| ID | File | Issue | Impact |
|---|---|---|---|
| ~~CODE-01~~ | `store/authStore.ts` | ✅ Fixed 2026-03-20 — mock accounts removed | |
| ~~CODE-02~~ | Various | ✅ Audited 2026-03-21 — only `console.error` in `lib/database/index.ts` (WatermelonDB setup error, no sensitive data). No sensitive auth/patient data logged. | |
| ~~CODE-03~~ | `types/index.ts` | ✅ Fixed 2026-03-20 — `AuthUser.phone`, `created_at`, `updated_at` added | |
| ~~CODE-04~~ | `types/index.ts` | ✅ Fixed 2026-03-20 — `ScreeningSession.app_version` added | |
| ~~CODE-05~~ | `types/index.ts` | ✅ Fixed 2026-03-20 — `PatientVitals.recorded_at`, `id`, `session_id` added | |
| ~~CODE-06~~ | `types/index.ts` | ✅ Fixed 2026-03-20 — `ThermalCapture.resolution_x`, `resolution_y` added | |
| CODE-07 | Multiple files | File path comments missing on some utility/edge function files — violates CLAUDE.md rule | Needs audit |
| ~~CODE-08~~ | `app/(clinic)/clinical-data.tsx` | ✅ Partially fixed 2026-03-21 — session + vitals + thermal captures now write to Supabase. Assessment still uses mock result. | |
| CODE-09 | `app/(clinic)/clinical-data.tsx` | `MOCK_ANGIOSOMES` still displayed in thermal preview — real angiosome values not yet computed from matrix | Misleading UI; angiosome computation deferred to GAP-04 |
| ~~CODE-10~~ | `app/(clinic)/assessment.tsx` | ✅ Fixed 2026-03-21 — `clearSession()` + `discardCapture()` called in `handleExit()` for both Discard and New Session buttons | |
| CODE-11 | `app/(clinic)/index.tsx:56` | Clinic name is hardcoded as `"Cebu City Health Center"` — does not read from the logged-in user's linked clinic | Wrong clinic shown to any non-Cebu-City operator |

---

## Schema / Database

| ID | Issue | Impact |
|---|---|---|
| ~~DB-01~~ | ✅ Fixed 2026-03-20 — all 8 tables verified against thesis schema | |
| ~~DB-02~~ | ✅ Fixed 2026-03-20 — RLS verified on all tables; all INSERT policies have correct WITH CHECK clauses | |
| DB-03 | WatermelonDB not installed | Offline-first architecture not started |
| DB-04 | No sync logic between local DB and Supabase | Offline-first not possible |

---

## Tracking

| Severity | Total | Open | Fixed |
|---|---|---|---|
| Critical | 5 | 1 | 4 |
| High (Gaps) | 11 | 10 | 1 |
| Medium (UX) | 9 | 2 | 7 |
| Auth | 15 | 0 | 15 |
| Low (Code) | 11 | 3 | 8 |
| Schema/DB | 4 | 2 | 2 |
| **Total** | **55** | **18** | **37** |

---

## Fix Priority Order
1. ~~BUG-01, BUG-02, BUG-03~~ — ✅ Done
2. ~~UX-01~~ — ✅ Done 2026-03-21
3. ~~GAP-05~~ — ✅ Done 2026-03-21
4. ~~UX-02~~ — ✅ Done
5. ~~UX-03~~ — ✅ Done
6. ~~CODE-10~~ — ✅ Done
7. ~~UX-04, UX-06~~ — ✅ Done 2026-03-21
8. ~~CODE-02~~ — ✅ Audited clean 2026-03-21
9. ~~BUG-04~~ — ✅ Done 2026-03-21
10. **BUG-05** — fix live-feed foot selector `onPress` (1-line fix per button, 30 min)
11. **UX-07** — wire session detail screens to real Supabase data (2–3 hrs)
12. **GAP-09** — wire history.tsx to real Supabase sessions (1–2 hrs)
13. **CODE-11** — fetch real clinic name in clinic dashboard (30 min)
14. **UX-08** — wire admin Deactivate/Activate to Supabase (1–2 hrs)
15. **GAP-10, GAP-11** — wire admin users + clinics to Supabase (2–3 hrs)
16. **GAP-07** — wire assessment Save button to `classification_results` (1 hr)
17. CODE-09 — real angiosome values (blocked on GAP-04 AI model)
18. DB-03, DB-04 — install WatermelonDB + sync logic (deferred)
19. GAP-01 through GAP-04 — hardware + cloud integration (deferred until hardware finalized)
