# QA Report — Bugs, Stubs & Issues
**Last verified:** 2026-03-21 (UX-01, GAP-05 implementation + pre-commit QA review)

---

## Critical — Blocks Real Usage

| ID | File | Issue | Impact |
|---|---|---|---|
| ~~BUG-01~~ | `app/(clinic)/pairing.tsx` | ✅ Fixed 2026-03-20 — navigates to `/(clinic)/live-feed` | |
| ~~BUG-02~~ | `app/(clinic)/live-feed.tsx` | ✅ Fixed 2026-03-20 — navigates to `/(clinic)/clinical-data` | |
| ~~BUG-03~~ | `app/(clinic)/clinical-data.tsx` | ✅ Fixed 2026-03-20 — navigates to `/(clinic)/assessment` after submit; Cancel returns to home | |
| BUG-04 | All roles | No 30-minute inactivity session timeout (FR-104) | Security requirement unmet |

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
| GAP-07 | `app/(clinic)/assessment.tsx` | Save/Discard buttons present but logic is stub | FR-604 not met |
| GAP-08 | `app/(clinic)/assessment.tsx` | No abnormal region overlay on thermal map | FR-603 partial |

---

## Medium — Incomplete UI / UX

| ID | File | Issue | Impact |
|---|---|---|---|
| ~~UX-01~~ | `app/(clinic)/index.tsx` | ✅ Fixed 2026-03-21 — all 4 buttons wired: Pair Device→pairing, New Screening→patient-select, Session History→history, Settings→settings. Ionicons replaced emojis. | |
| UX-02 | `app/(patient)/index.tsx` | Session card `onPress` is empty | Patient cannot view session detail |
| UX-03 | `app/(admin)/index.tsx` | Multiple action buttons with empty handlers | Admin actions non-functional |
| UX-04 | `app/(clinic)/settings.tsx` | Settings screen is a stub — no functional settings | UI-07 not met |
| ~~UX-05~~ | `app/(patient)/settings.tsx` | ✅ Fixed 2026-03-20 — proper settings screen with Sign Out, Change Password, etc. | |
| UX-06 | `app/(admin)/settings.tsx` | Settings screen is a stub | UI-07 not met |
| UX-07 | `app/(patient)/session/[id].tsx` | Session detail view is minimal stub | Patient cannot see session details |

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
| CODE-02 | Various | `console.log` usage not audited — may log sensitive auth data | Violates security rules in CLAUDE.md |
| ~~CODE-03~~ | `types/index.ts` | ✅ Fixed 2026-03-20 — `AuthUser.phone`, `created_at`, `updated_at` added | |
| ~~CODE-04~~ | `types/index.ts` | ✅ Fixed 2026-03-20 — `ScreeningSession.app_version` added | |
| ~~CODE-05~~ | `types/index.ts` | ✅ Fixed 2026-03-20 — `PatientVitals.recorded_at`, `id`, `session_id` added | |
| ~~CODE-06~~ | `types/index.ts` | ✅ Fixed 2026-03-20 — `ThermalCapture.resolution_x`, `resolution_y` added | |
| CODE-07 | Multiple files | File path comments missing — violates CLAUDE.md rule | Needs audit |
| ~~CODE-08~~ | `app/(clinic)/clinical-data.tsx` | ✅ Partially fixed 2026-03-21 — session + vitals + thermal captures now write to Supabase. Assessment still uses mock result. |  |
| CODE-09 | `app/(clinic)/clinical-data.tsx` | `MOCK_ANGIOSOMES` still displayed in thermal preview — real angiosome values not yet computed from matrix | Misleading UI; angiosome computation deferred to GAP-04 |
| CODE-10 | `app/(clinic)/assessment.tsx` | `clearSession()` not called after assessment complete/discard — `selectedPatient` + `activeSession` persist in store | Stale state if user returns to dashboard and starts new flow |

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
| Critical | 4 | 1 | 3 |
| High (Gaps) | 8 | 7 | 1 |
| Medium (UX) | 7 | 4 | 3 |
| Auth | 15 | 0 | 15 |
| Low (Code) | 10 | 3 | 7 |
| Schema/DB | 4 | 2 | 2 |
| **Total** | **48** | **17** | **31** |

---

## Fix Priority Order
1. ~~BUG-01, BUG-02, BUG-03~~ — ✅ Done
2. ~~UX-01~~ — ✅ Done 2026-03-21
3. ~~GAP-05~~ — ✅ Done 2026-03-21
4. UX-02 — patient session card onPress (next up)
5. UX-03 — admin action buttons
6. CODE-10 — call `clearSession()` after assessment complete/discard
7. CODE-09 — real angiosome values in clinical-data preview (blocked on GAP-04)
8. DB-03, DB-04 — install WatermelonDB + sync logic
9. GAP-01 through GAP-04 — hardware + cloud integration (deferred until hardware finalized)
10. BUG-04 — inactivity timeout
