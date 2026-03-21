# QA Report — Bugs & Issues
**Last verified:** 2026-03-21 (Full codebase QA audit — 51 source files reviewed)

---

## Code Quality

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~CODE-01~~ | `store/authStore.ts` | — | Mock accounts hardcoded in auth store | High | ✅ Fixed 2026-03-20 |
| ~~CODE-02~~ | Various | — | `console.log` statements audited — only `console.error` in `lib/database/index.ts` (WatermelonDB setup, no sensitive data) | Low | ✅ Fixed 2026-03-21 |
| ~~CODE-03~~ | `types/index.ts` | — | `AuthUser` missing `phone`, `created_at`, `updated_at` | Low | ✅ Fixed 2026-03-20 |
| ~~CODE-04~~ | `types/index.ts` | — | `ScreeningSession` missing `app_version` | Low | ✅ Fixed 2026-03-20 |
| ~~CODE-05~~ | `types/index.ts` | — | `PatientVitals` missing `recorded_at`, `id`, `session_id` | Low | ✅ Fixed 2026-03-20 |
| ~~CODE-06~~ | `types/index.ts` | — | `ThermalCapture` missing `resolution_x`, `resolution_y` | Low | ✅ Fixed 2026-03-20 |
| CODE-07 | Multiple files | 1 | File path comments missing on some utility/edge function files | Low | Open |
| ~~CODE-08~~ | `app/(clinic)/clinical-data.tsx` | — | Submit handler was dummy setTimeout — no real upload | High | ✅ Fixed 2026-03-21 |
| CODE-09 | `app/(clinic)/clinical-data.tsx` | 24 | `MOCK_ANGIOSOMES` still used in thermal preview — real values not computed from matrix | Medium | Deferred (blocked on GAP-04) |
| ~~CODE-10~~ | `app/(clinic)/assessment.tsx` | — | `clearSession()` + `discardCapture()` not called on exit | Medium | ✅ Fixed 2026-03-21 |
| ~~CODE-11~~ | `app/(clinic)/index.tsx` | 56 | Clinic name hardcoded as "Cebu City Health Center" | Medium | ✅ Fixed 2026-03-21 |

---

## UI / UX

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~BUG-01~~ | `app/(clinic)/pairing.tsx` | — | "Connect & Start Scanning" button had no `onPress` — never navigated to live-feed | Critical | ✅ Fixed 2026-03-20 |
| ~~BUG-02~~ | `app/(clinic)/live-feed.tsx` | — | "Use This Frame" button had no `onPress` — never navigated to clinical-data | Critical | ✅ Fixed 2026-03-20 |
| ~~BUG-03~~ | `app/(clinic)/clinical-data.tsx` | — | Submit and Cancel buttons had no `onPress` handlers | Critical | ✅ Fixed 2026-03-20 |
| ~~BUG-05~~ | `app/(clinic)/live-feed.tsx` | 148–165 | Foot selector buttons had no `onPress`; active style hardcoded to "Bilateral" | Critical | ✅ Fixed 2026-03-21 |
| ~~UX-01~~ | `app/(clinic)/index.tsx` | — | All 4 Quick Action buttons had no `onPress` handlers | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-02~~ | `app/(patient)/index.tsx` | — | Session card `onPress` missing — tapping did nothing | Medium | ✅ Fixed 2026-03-20 |
| ~~UX-03~~ | `app/(admin)/index.tsx` | — | All action buttons (Invite User, Add Clinic, Export) had no handlers | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-04~~ | `app/(clinic)/settings.tsx` | — | All settings handlers were stubs | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-05~~ | `app/(patient)/settings.tsx` | — | Settings screen was a stub | Medium | ✅ Fixed 2026-03-20 |
| ~~UX-06~~ | `app/(admin)/settings.tsx` | — | All settings handlers were stubs | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-07~~ | `app/(patient)/session/[id].tsx` + `app/(clinic)/session/[id].tsx` | — | Both session detail screens read from `MOCK_CLINIC_SESSIONS` | High | ✅ Fixed 2026-03-21 |
| ~~UX-08~~ | `app/(admin)/users.tsx` + `app/(admin)/clinics.tsx` | — | Activate/Deactivate buttons only called `setSelected(null)` — no Supabase update | High | ✅ Fixed 2026-03-21 |

---

## Supabase / Data Integration

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~GAP-05~~ | `app/(clinic)/clinical-data.tsx` | — | Submit handler did not write to Supabase — sessions, vitals, captures never saved | Critical | ✅ Fixed 2026-03-21 |
| ~~GAP-07~~ | `app/(clinic)/assessment.tsx` | — | "Save to Cloud" only called `setSaved(true)` — never inserted to `classification_results` | High | ✅ Fixed 2026-03-21 |
| ~~GAP-09~~ | `app/(clinic)/history.tsx` | — | Reads `MOCK_CLINIC_SESSIONS` — real Supabase sessions never shown | High | ✅ Fixed 2026-03-21 |
| ~~GAP-10~~ | `app/(admin)/users.tsx` | — | Reads `MOCK_ALL_USERS` — not wired to `profiles` table | High | ✅ Fixed 2026-03-21 |
| ~~GAP-11~~ | `app/(admin)/clinics.tsx` | — | Reads `MOCK_CLINICS` + `MOCK_DEVICES` — not wired to real tables | High | ✅ Fixed 2026-03-21 |
| GAP-04 | `app/(clinic)/assessment.tsx` | 32 | AI classification result is hardcoded mock — no real cloud inference or polling | High | Deferred (hardware dependency) |
| GAP-08 | `app/(clinic)/assessment.tsx` | — | No abnormal region overlay on thermal map | Medium | Open |

---

## Performance

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| PERF-01 | `app/(clinic)/session/[id].tsx` | 25–26 | `generateMockThermalMatrix()` called at module scope — runs on import, not on render | Low | Open |
| PERF-02 | `app/(patient)/session/[id].tsx` | 24–25 | Same — `generateMockThermalMatrix()` at module scope | Low | Open |
| PERF-03 | `app/(clinic)/assessment.tsx` | 86–87 | `leftMatrix` / `rightMatrix` generated at component scope on every render — should be in `useRef` or `useMemo` | Low | Open |

---

## Accessibility

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| A11Y-01 | `app/(clinic)/live-feed.tsx` | 98–106 | "Guides" toggle `TouchableOpacity` has no `accessibilityLabel` | Low | Open |
| A11Y-02 | `app/(clinic)/index.tsx` | 45 | Chevron `›` `Text` inside action card has no accessibility role | Low | Open |
| A11Y-03 | `constants/theme.ts` | — | Contrast check required — muted text (`Colors.text.muted`) on card background needs WCAG AA verification | Medium | Open |

---

## Security

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~SEC-01~~ | `store/authStore.ts` | — | Mock accounts exposed real service_role-equivalent bypass | Critical | ✅ Fixed 2026-03-20 |
| ~~SEC-02~~ | All tables | — | RLS INSERT policies missing WITH CHECK clauses | High | ✅ Fixed 2026-03-20 |
| SEC-03 | `app/(clinic)/clinical-data.tsx` | 76–106 | Input sanitization only covers blood glucose and BP ranges — heart rate and HbA1c have no range validation before Supabase insert | Medium | Open |

---

## Navigation

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| NAV-01 | `app/(clinic)/assessment.tsx` | — | No back navigation — user cannot leave without discarding or saving; intentional but worth flagging for UX review | Low | Open |

---

## Auth (History — All Fixed 2026-03-20)

| ID | File | Issue | Status |
|---|---|---|---|
| ~~AUTH-01~~ | `authStore.ts` | `resetPasswordForEmail` missing `redirectTo` | ✅ Fixed 2026-03-20 |
| ~~AUTH-02~~ | `(auth)/` | `update-password.tsx` screen missing | ✅ Fixed 2026-03-20 |
| ~~AUTH-03~~ | `_layout.tsx` | Deep link handler missing for password reset and email confirmation | ✅ Fixed 2026-03-20 |
| ~~AUTH-04~~ | `register.tsx` | Password validation showed errors one at a time instead of all at once | ✅ Fixed 2026-03-20 |
| ~~AUTH-05~~ | `authStore.ts` | Mock accounts still present | ✅ Fixed 2026-03-20 |
| ~~AUTH-06~~ | `authStore.ts` | No login attempt lockout | ✅ Fixed 2026-03-20 |
| ~~AUTH-07~~ | — | Admin registration flow unclear | ✅ By design — admin via Supabase dashboard only |
| ~~AUTH-08~~ | `login.tsx` | Login rejected valid passwords under 8 chars | ✅ Fixed 2026-03-20 |
| ~~AUTH-09~~ | `login.tsx`, `register.tsx` | Unknown role caused silent freeze | ✅ Fixed 2026-03-20 |
| ~~AUTH-10~~ | `register.tsx` | `selectedClinicId` not reset when role switched | ✅ Fixed 2026-03-20 |
| ~~AUTH-11~~ | `update-password.tsx` | No session guard — form accessible without valid reset token | ✅ Fixed 2026-03-20 |
| ~~AUTH-12~~ | `_layout.tsx` | Deep link handler too broad — triggered on unrelated URLs | ✅ Fixed 2026-03-20 |
| ~~AUTH-13~~ | `authStore.ts` | `onAuthStateChange` subscription leaked — not cleaned up on re-init | ✅ Fixed 2026-03-20 |
| ~~AUTH-14~~ | `authStore.ts` | `pendingClinicId` stored for all roles; `logout()` missing try-finally | ✅ Fixed 2026-03-20 |
| ~~AUTH-15~~ | `authStore.ts` | `PGRST116` (no profile row) not mapped to friendly error | ✅ Fixed 2026-03-20 |
| ~~BUG-04~~ | `app/_layout.tsx` | No inactivity timeout — users never auto-logged out | ✅ Fixed 2026-03-21 |

---

## Schema / Database

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~DB-01~~ | Supabase | — | Tables not verified against thesis schema | High | ✅ Fixed 2026-03-20 |
| ~~DB-02~~ | Supabase | — | RLS not verified; INSERT WITH CHECK clauses unconfirmed | High | ✅ Fixed 2026-03-20 |
| GAP-06 / DB-03 | — | — | WatermelonDB installed but sync logic not started — no offline support | High | Deferred |
| DB-04 | — | — | No conflict resolution strategy designed for local/remote sync | Medium | Deferred |
| GAP-01 | `store/deviceStore.ts` | — | BLE scan is mock — no `react-native-ble-plx` | High | Deferred (hardware) |
| GAP-02 | `store/deviceStore.ts` | — | Wi-Fi WebSocket to `192.168.4.1:3333` not implemented | High | Deferred (hardware) |
| GAP-03 | `store/thermalStore.ts` | — | Thermal frames from mock `setInterval`, not real hardware | High | Deferred (hardware) |

---

## Tracking

| Area | Total | Open | Fixed | Deferred |
|---|---|---|---|---|
| Code Quality | 11 | 1 | 9 | 1 |
| UI / UX | 12 | 0 | 12 | 0 |
| Supabase / Data | 7 | 2 | 5 | 0 |
| Performance | 3 | 3 | 0 | 0 |
| Accessibility | 3 | 3 | 0 | 0 |
| Security | 3 | 1 | 2 | 0 |
| Navigation | 1 | 1 | 0 | 0 |
| Auth | 16 | 0 | 16 | 0 |
| Schema / DB | 7 | 0 | 2 | 5 |
| **Total** | **63** | **11** | **46** | **6** |
