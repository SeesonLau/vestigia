# QA Report — Bugs & Issues
**Last verified:** 2026-04-07 (v0.9.1)

---

## QA Coverage — What Each Area Checks

| Area | What It Covers | Files Scanned |
|---|---|---|
| **Code Quality** | TypeScript errors, `any` types, unused imports/variables, `console.log` with sensitive data, hardcoded secrets, missing file path comments | `app/`, `components/`, `store/`, `hooks/`, `lib/`, `types/` |
| **UI / UX** | Empty/stub screens, missing loading states, missing error states, missing empty states, hardcoded placeholder strings, dead `onPress` handlers | `app/` |
| **Supabase / Data Integration** | Correct table names, PostgREST join normalization, error handling on every insert/update, screens still reading from mock data, missing writes | All files calling `supabase.*` |
| **Performance** | Module-scope expensive calls, missing `setInterval` cleanup, inline arrow functions in `FlatList renderItem`, missing `keyExtractor`, Animated values outside `useRef` | `app/`, `components/` |
| **Accessibility** | Missing `accessibilityLabel` on icon-only buttons, WCAG AA color contrast ratios (min 4.5:1 body text, 3:1 large text) calculated from theme | `app/`, `components/`, `constants/theme.ts` |
| **Security** | Hardcoded API keys/secrets, `console.log` leaking tokens or patient data, anon-only client enforcement, RLS enabled on all tables, input sanitization before Supabase | All source files, Supabase config |
| **Navigation** | Every `router.push()` target maps to a real file, no dead-end screens, dynamic routes receive required params, all tabs/links point to real routes | `app/` routing structure |
| **Auth** | Sign Out across all roles, inactivity timeout mounted, password reset deep link, login lockout, session persistence | `app/(auth)/`, `store/authStore.ts`, `app/_layout.tsx` |
| **Schema / Database** | Table existence, column match against thesis schema, foreign keys, RLS policies, TypeScript types vs actual DB columns | `types/`, Supabase live query |
| **Regression** | Every ~~fixed~~ item in this file cross-referenced against current code to confirm the fix still exists and was not reverted | All previously fixed files |

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
| ~~CODE-07~~ | Multiple files | 1 | File path comments missing on some utility/edge function files | Low | ✅ Fixed 2026-03-21 |
| ~~CODE-08~~ | `app/(clinic)/clinical-data.tsx` | — | Submit handler was dummy setTimeout — no real upload | High | ✅ Fixed 2026-03-21 |
| CODE-09 | `app/(clinic)/clinical-data.tsx` | 26 | `MOCK_ANGIOSOMES` still used in thermal preview — real values not computed from matrix | Medium | Deferred (blocked on GAP-04) |
| ~~CODE-10~~ | `app/(clinic)/assessment.tsx` | — | `clearSession()` + `discardCapture()` not called on exit | Medium | ✅ Fixed 2026-03-21 |
| ~~CODE-11~~ | `app/(clinic)/index.tsx` | 56 | Clinic name hardcoded as "Cebu City Health Center" | Medium | ✅ Fixed 2026-03-21 |
| ~~CODE-12~~ | `app/(admin)/index.tsx` | 70, 85 | `(usersData as any[])` and `(clinicsData as any[])` — typed interfaces already defined but cast bypassed | Medium | ✅ Fixed 2026-03-21 |
| ~~CODE-13~~ | `app/(clinic)/assessment.tsx` | 163 | `.map((step, i) => ...)` — param `i` declared but never read | Low | ✅ Fixed 2026-03-21 |
| ~~CODE-14~~ | `app/(auth)/login.tsx` | 153 | Version string hardcoded as `"Vestigia v1.0.0"` | Low | ✅ Fixed 2026-03-30 |
| CODE-15 | `app/(auth)/update-password.tsx` | 4 | `useEffect` in a second separate `import from "react"` statement — should be consolidated | Low | Open |
| ~~CODE-16~~ | `lib/debug.ts` | 8 | `dbg()` calls `console.log` unconditionally with no `__DEV__` guard | Medium | ✅ Fixed 2026-03-30 |
| CODE-17 | `store/sessionStore.ts` | 28, 56 | Three Zustand stores in one file; inline comments label them as separate files — misleading | Low | Open (by design) |
| CODE-18 | `app/(clinic)/_layout.tsx` | 14 | `label: string` prop declared in `TabIcon` TypeScript type but never used in function | Low | Open |

---

## UI / UX

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~BUG-01~~ | `app/(clinic)/pairing.tsx` | — | "Connect & Start Scanning" button had no `onPress` | Critical | ✅ Fixed 2026-03-20 |
| ~~BUG-02~~ | `app/(clinic)/live-feed.tsx` | — | "Use This Frame" button had no `onPress` | Critical | ✅ Fixed 2026-03-20 |
| ~~BUG-03~~ | `app/(clinic)/clinical-data.tsx` | — | Submit and Cancel buttons had no `onPress` handlers | Critical | ✅ Fixed 2026-03-20 |
| ~~BUG-05~~ | `app/(clinic)/live-feed.tsx` | 148–165 | Foot selector buttons had no `onPress`; active style hardcoded to "Bilateral" | Critical | ✅ Fixed 2026-03-21 |
| ~~UX-01~~ | `app/(clinic)/index.tsx` | — | All 4 Quick Action buttons had no `onPress` handlers | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-02~~ | `app/(patient)/index.tsx` | — | Session card `onPress` missing | Medium | ✅ Fixed 2026-03-20 |
| ~~UX-03~~ | `app/(admin)/index.tsx` | — | All action buttons had no handlers | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-04~~ | `app/(clinic)/settings.tsx` | — | All settings handlers were stubs | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-05~~ | `app/(patient)/settings.tsx` | — | Settings screen was a stub | Medium | ✅ Fixed 2026-03-20 |
| ~~UX-06~~ | `app/(admin)/settings.tsx` | — | All settings handlers were stubs | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-07~~ | `app/(patient)/session/[id].tsx` + `app/(clinic)/session/[id].tsx` | — | Both session detail screens read from `MOCK_CLINIC_SESSIONS` | High | ✅ Fixed 2026-03-21 |
| ~~UX-08~~ | `app/(admin)/users.tsx` + `app/(admin)/clinics.tsx` | — | Activate/Deactivate buttons only called `setSelected(null)` | High | ✅ Fixed 2026-03-21 |
| ~~UX-09~~ | `app/(admin)/index.tsx` | 47–95 | No `ActivityIndicator` or error message for `fetchStats()` | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-10~~ | `app/(patient)/index.tsx` | 36–68 | No error state if `patients` or `screening_sessions` fetch fails | Medium | ✅ Fixed 2026-03-21 |
| UX-11 | `app/(clinic)/index.tsx` | 159–178 | Device status card fully hardcoded: "DPN-Scanner-01", "MI0802M5S", "v2.1.4", "Feb 10" | Low | Deferred (hardware) |
| ~~UX-12~~ | `app/(admin)/settings.tsx` | 88–101 | `system_config` load failure silently ignored | Low | ✅ Fixed 2026-03-21 |
| ~~UX-13~~ | `app/(clinic)/index.tsx` | 93 | "Good morning" hardcoded — displays wrong time of day | Low | ✅ Fixed 2026-03-21 |
| ~~UX-14~~ | Multiple files (20) | — | All emoji / unclear Unicode symbols replaced with Ionicons | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-15~~ | `app/(clinic)/index.tsx` | 67–95 | No `ActivityIndicator` while `fetchData()` runs — stats display as 0 while loading | Low | ✅ Fixed 2026-03-30 |
| ~~UX-16~~ | `app/(clinic)/index.tsx` | 82–90 | `clinicResult.error` and `sessionsResult.error` checked but silently ignored | Medium | ✅ Fixed 2026-03-30 |
| ~~UX-17~~ | Multiple screens | various | Debug UI ID strings visible in production: `"UI-02"` through `"UI-08"` | Medium | ✅ Fixed 2026-03-30 |
| ~~BUG-06~~ | `app/(patient)/index.tsx`, `app/(clinic)/assessment.tsx`, `app/(patient)/session/[id].tsx`, `app/(clinic)/session/[id].tsx` | 22 | `THUMB_H` ratio used `(62 / 80)` — wrong for Lepton 3.5 (160×120); fixed to `(120 / 160)` in all 4 affected files | Low | ✅ Fixed 2026-04-06 |

---

## Supabase / Data Integration

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~GAP-05~~ | `app/(clinic)/clinical-data.tsx` | — | Submit handler did not write to Supabase | Critical | ✅ Fixed 2026-03-21 |
| ~~GAP-07~~ | `app/(clinic)/assessment.tsx` | — | "Save to Cloud" never inserted to `classification_results` | High | ✅ Fixed 2026-03-21 |
| ~~GAP-09~~ | `app/(clinic)/history.tsx` | — | Reads `MOCK_CLINIC_SESSIONS` | High | ✅ Fixed 2026-03-21 |
| ~~GAP-10~~ | `app/(admin)/users.tsx` | — | Reads `MOCK_ALL_USERS` | High | ✅ Fixed 2026-03-21 |
| ~~GAP-11~~ | `app/(admin)/clinics.tsx` | — | Reads `MOCK_CLINICS` + `MOCK_DEVICES` | High | ✅ Fixed 2026-03-21 |
| GAP-04 | `app/(clinic)/assessment.tsx` | 32 | AI classification result is hardcoded mock — no real cloud inference | High | Deferred (hardware) |
| GAP-08 | `app/(clinic)/assessment.tsx` | — | No abnormal region overlay on thermal map | Medium | Deferred (API returns no per-angiosome spatial data) |
| ~~GAP-12~~ | `app/(clinic)/index.tsx` | 58–85 | Both Supabase calls use `.then()` with no error branch | Medium | ✅ Fixed 2026-03-21 |
| ~~GAP-13~~ | `app/(admin)/index.tsx` | 49–93 | `Promise.all()` has zero error handling | Medium | ✅ Fixed 2026-03-21 |
| ~~GAP-14~~ | `app/(patient)/index.tsx` | 37–66 | Neither fetch destructures `error` | Medium | ✅ Fixed 2026-03-21 |
| ~~GAP-15~~ | `app/(clinic)/history.tsx` | 115–120 | PostgREST join alias mismatch — `classification` may be undefined; `positiveCount`/`negativeCount` always 0 | High | ✅ Fixed 2026-03-30 |
| ~~GAP-16~~ | `app/(admin)/users.tsx` | 34 | `fetchUsers`: `error` not destructured; silent failure | Medium | ✅ Fixed 2026-03-30 |
| ~~GAP-17~~ | `app/(admin)/clinics.tsx` | 52 | `fetchClinics`: same as GAP-16 | Medium | ✅ Fixed 2026-03-30 |
| ~~GAP-18~~ | `app/(admin)/users.tsx` + `app/(admin)/clinics.tsx` | 102 / — | `handleToggleActive`: on Supabase error, no user notification | Medium | ✅ Fixed 2026-04-05 |

---

## Performance

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~PERF-01~~ | `app/(clinic)/session/[id].tsx` | 25–26 | `generateMockThermalMatrix()` at module scope | Low | ✅ Fixed 2026-03-21 |
| ~~PERF-02~~ | `app/(patient)/session/[id].tsx` | 24–25 | Same — `generateMockThermalMatrix()` at module scope | Low | ✅ Fixed 2026-03-21 |
| ~~PERF-03~~ | `app/(clinic)/assessment.tsx` | 130–131 | `leftMatrix`/`rightMatrix` generated at component scope on every render | Low | ✅ Fixed 2026-03-21 |
| ~~PERF-04~~ | `app/(patient)/index.tsx` | 22–23 | `generateMockThermalMatrix()` at module scope | Low | ✅ Fixed 2026-03-21 |
| ~~PERF-05~~ | `app.json` | 26 | `"output": "static"` caused SSR crash on Metro start | Critical | ✅ Fixed 2026-03-21 |
| ~~PERF-06~~ | `lib/supabase.ts` | 8 | Supabase `createClient()` at module scope blocking startup 5+ sec | High | ✅ Fixed 2026-03-21 |
| ~~PERF-07~~ | `lib/supabase.ts` | 24 | Proxy `get` trap unbound methods causing silent failures | High | ✅ Fixed 2026-03-21 |
| ~~PERF-08~~ | `store/authStore.ts` | 75 | Full profile DB fetch on every cold start | Medium | ✅ Fixed 2026-03-21 |
| ~~PERF-09~~ | `app/(clinic)/history.tsx` | 132 | Inline arrow function in `FlatList renderItem` | Low | ✅ Fixed 2026-03-30 |
| ~~PERF-10~~ | `app/(admin)/users.tsx` | 107 | Inline arrow function in `FlatList renderItem` | Low | ✅ Fixed 2026-03-30 |
| ~~PERF-11~~ | `app/(admin)/clinics.tsx` | 100 | Inline arrow function in `FlatList renderItem` | Low | ✅ Fixed 2026-03-30 |

---

## Accessibility

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~A11Y-01~~ | `app/(clinic)/live-feed.tsx` | 98–106 | "Guides" toggle has no `accessibilityLabel` | Low | ✅ Fixed 2026-03-21 |
| ~~A11Y-02~~ | `app/(clinic)/index.tsx` | 45 | Chevron in action card has no accessibility role | Low | ✅ Fixed 2026-03-21 |
| ~~A11Y-03~~ | `constants/theme.ts` | 54 | `Colors.text.muted` `#4d6a96` on `#050d1a` = 3.64:1 — fails WCAG AA | Medium | ✅ Fixed 2026-03-21 |
| A11Y-04 | `components/ui/index.tsx` | 193–201 | Muted badge text on badge bg ≈ 4.4:1 — borderline below WCAG AA 4.5:1 for xs text | Low | Open |
| ~~A11Y-05~~ | `app/(clinic)/_layout.tsx` | 32–71 | No `tabBarAccessibilityLabel` on any `Tabs.Screen` after text labels removed | Medium | ✅ Fixed 2026-03-30 |

---

## Security

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~SEC-01~~ | `store/authStore.ts` | — | Mock accounts exposed service_role-equivalent bypass | Critical | ✅ Fixed 2026-03-20 |
| ~~SEC-02~~ | All tables | — | RLS INSERT policies missing WITH CHECK clauses | High | ✅ Fixed 2026-03-20 |
| ~~SEC-03~~ | `app/(clinic)/clinical-data.tsx` | 76–106 | Heart rate and HbA1c had no range validation before Supabase insert | Medium | ✅ Fixed 2026-03-21 |

---

## Navigation

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| NAV-01 | `app/(clinic)/assessment.tsx` | — | No back navigation — intentional but worth flagging for UX review | Low | Open (by design) |
| ~~NAV-02~~ | `app/index.tsx` | 20 | `router.replace()` in `useEffect` fired before Root Layout mounted | High | ✅ Fixed 2026-03-21 |
| ~~NAV-03~~ | `app/(patient)/settings.tsx` | — | Patient settings screen unreachable — no nav push anywhere | Medium | ✅ Fixed 2026-03-30 |

---

## Auth (History — All Fixed)

| ID | File | Issue | Status |
|---|---|---|---|
| ~~AUTH-01~~ | `authStore.ts` | `resetPasswordForEmail` missing `redirectTo` | ✅ Fixed 2026-03-20 |
| ~~AUTH-02~~ | `(auth)/` | `update-password.tsx` screen missing | ✅ Fixed 2026-03-20 |
| ~~AUTH-03~~ | `_layout.tsx` | Deep link handler missing | ✅ Fixed 2026-03-20 |
| ~~AUTH-04~~ | `register.tsx` | Password validation showed errors one at a time | ✅ Fixed 2026-03-20 |
| ~~AUTH-05~~ | `authStore.ts` | Mock accounts still present | ✅ Fixed 2026-03-20 |
| ~~AUTH-06~~ | `authStore.ts` | No login attempt lockout | ✅ Fixed 2026-03-20 |
| ~~AUTH-07~~ | — | Admin registration flow unclear | ✅ By design — admin via Supabase dashboard only |
| ~~AUTH-08~~ | `login.tsx` | Login rejected valid passwords under 8 chars | ✅ Fixed 2026-03-20 |
| ~~AUTH-09~~ | `login.tsx`, `register.tsx` | Unknown role caused silent freeze | ✅ Fixed 2026-03-20 |
| ~~AUTH-10~~ | `register.tsx` | `selectedClinicId` not reset when role switched | ✅ Fixed 2026-03-20 |
| ~~AUTH-11~~ | `update-password.tsx` | No session guard | ✅ Fixed 2026-03-20 |
| ~~AUTH-12~~ | `_layout.tsx` | Deep link handler too broad | ✅ Fixed 2026-03-20 |
| ~~AUTH-13~~ | `authStore.ts` | `onAuthStateChange` subscription leaked | ✅ Fixed 2026-03-20 |
| ~~AUTH-14~~ | `authStore.ts` | `pendingClinicId` stored for all roles; `logout()` missing try-finally | ✅ Fixed 2026-03-20 |
| ~~AUTH-15~~ | `authStore.ts` | `PGRST116` not mapped to friendly error | ✅ Fixed 2026-03-20 |
| ~~BUG-04~~ | `app/_layout.tsx` | No inactivity timeout | ✅ Fixed 2026-03-21 |

---

## Schema / Database

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~DB-01~~ | Supabase | — | Tables not verified against thesis schema | High | ✅ Fixed 2026-03-20 |
| ~~DB-02~~ | Supabase | — | RLS not verified; INSERT WITH CHECK clauses unconfirmed | High | ✅ Fixed 2026-03-20 |
| GAP-06 / DB-03 | — | — | WatermelonDB sync logic not started — no offline support | High | Deferred |
| DB-04 | — | — | No conflict resolution strategy for local/remote sync | Medium | Deferred |
| ~~GAP-01~~ | `lib/thermal/bleCamera.ts` | — | BLE scan is mock — no `react-native-ble-plx` | High | ✅ Fixed 2026-04-06 |
| ~~GAP-02~~ | `lib/thermal/wifiCamera.ts` | — | Wi-Fi WebSocket to ESP32 not implemented | High | ✅ Fixed 2026-04-06 |
| ~~GAP-03~~ | `app/(clinic)/live-feed.tsx` | — | Thermal frames from mock `setInterval`, not real hardware | High | ✅ Fixed 2026-04-06 (WiFi WebSocket + UVC paths) |
| HW-01 | `android/app/.../UVCModule.kt` | — | UVCModule.kt is a stub — rejects all calls; real libuvccamera-release.aar not linked | High | Open (needs AAR) |

---

## Tracking

| Area | Total | Open | Fixed | Deferred |
|---|---|---|---|---|
| Code Quality | 18 | 3 | 14 | 1 |
| UI / UX | 22 | 1 | 20 | 1 (UX-11) |
| Supabase / Data | 14 | 0 | 12 | 2 (GAP-04, GAP-08) |
| Performance | 11 | 0 | 11 | 0 |
| Accessibility | 5 | 1 | 4 | 0 |
| Security | 3 | 0 | 3 | 0 |
| Navigation | 3 | 1 | 2 | 0 |
| Auth | 16 | 0 | 16 | 0 |
| Schema / DB | 8 | 1 | 5 | 2 |
| **Total** | **100** | **6** | **87** | **6** |

**Overall QA Status: 94% Complete** — 6 open items (3 cosmetic code quality, 1 a11y contrast, 1 nav by-design, 1 hardware stub). 6 deferred (all hardware/API dependent).
