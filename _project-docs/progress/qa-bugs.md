# QA Report — Bugs & Issues
**Last verified:** 2026-05-08 (post-pipeline-collapse audit @ `main 50f0489`)

Changes since the earlier 2026-05-08 audit at `main eac6ed3`: regenerated Android launcher icons from `app.json` (the create-expo-app default blue triangle was still baked into `mipmap-*/ic_launcher*.webp`; prebuild now emits the LumenAI pulse mark); splash colours pulled from `app.json` (`#0E7490` light, `#083344` dark); symmetric 3-slot capture pipeline driven by the user-facing Raw/Enhanced toggle — both modes produce (palette full frame, palette cropped or null, isolated cropped to ROI) and only the underlying matrix differs. Native `processCapture` derives `feedMode` from the `enhanced` flag, the divergent `unprocessed`/`processed` branches in `processThermalFrames` are collapsed to one uniform path, the TS bridge passes the value through instead of hardcoding, and the bundle viewers (online + offline) now show RAW / RAW · CROPPED / ISOLATED or ENHANCED / ENHANCED · CROPPED / ISOLATED. Offline `ThermalBundle` persists `feed_mode` and `FootData.processed_image_b64` is now nullable.

Earlier 2026-05-08 changes (still in scope): admin-gating overhaul — clinic signup now requires admin approval before login (`clinics.approval_status` + RLS-fenced trigger); admin-mediated password-reset queue (`clinic_password_reset_requests` + `submit_password_reset_request` RPC + `admin-set-clinic-password` Edge Function with service-role-only password update); support tickets table + `submit_support_ticket` RPC + per-role Settings entries; new mobile screens (`clinic-pending-approval`, `forgot-password` patient/clinic split, in-Settings `request-password-reset`, shared `FeedbackScreen` rendered by both `(clinic)/feedback` and `(patient)/feedback`); new admin Next.js web console under `web/` (login, dashboard, clinics queue, password-reset queue, ticket inbox) with `useAdminSession` hook + typed RPC wrappers + Edge-Function-backed Set Password modal; LumenAI logo + thermal background motif applied across the admin web app; create-next-app boilerplate dropped.

---

## Code Quality

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~CODE-01~~ | `store/authStore.ts` | — | Mock accounts hardcoded in auth store | High | ✅ Fixed 2026-03-20 |
| ~~CODE-02~~ | Various | — | `console.log` audit — only `console.warn`/`console.error` in non-sensitive paths | Low | ✅ Fixed 2026-03-21 |
| ~~CODE-03~~ | `types/index.ts` | — | `AuthUser` missing `phone`, `created_at`, `updated_at` | Low | ✅ Fixed 2026-03-20 |
| ~~CODE-04~~ | `types/index.ts` | — | `ScreeningSession` missing `app_version` | Low | ✅ Fixed 2026-03-20 |
| ~~CODE-05~~ | `types/index.ts` | — | `PatientVitals` missing `recorded_at`, `id`, `session_id` | Low | ✅ Fixed 2026-03-20 |
| ~~CODE-06~~ | `types/index.ts` | — | `ThermalCapture` missing `resolution_x`, `resolution_y` | Low | ✅ Fixed 2026-03-20 |
| ~~CODE-07~~ | Multiple files | 1 | File-path comment missing on some utility files | Low | ✅ Fixed 2026-03-21 |
| ~~CODE-08~~ | `app/(clinic)/clinical-data.tsx` | — | Submit handler was dummy setTimeout — no real upload | High | ✅ Fixed 2026-03-21 |
| ~~CODE-09~~ | `app/(clinic)/clinical-data.tsx` | 26 | `MOCK_ANGIOSOMES` removed when DPN API began returning real per-angiosome regions | Medium | ✅ Fixed 2026-05-07 (superseded by FR-504) |
| ~~CODE-10~~ | `app/(clinic)/assessment.tsx` | — | `clearSession()` + `discardCapture()` not called on exit | Medium | ✅ Fixed 2026-03-21 |
| ~~CODE-11~~ | `app/(clinic)/index.tsx` | 56 | Clinic name hardcoded as "Cebu City Health Center" | Medium | ✅ Fixed 2026-03-21 |
| ~~CODE-12~~ | `app/(admin)/index.tsx` | 70, 85 | `(usersData as any[])` casts | Medium | ✅ Fixed 2026-03-21 (admin moved to web app) |
| ~~CODE-13~~ | `app/(clinic)/assessment.tsx` | 163 | Unused param `i` in `.map()` | Low | ✅ Fixed 2026-03-21 |
| ~~CODE-14~~ | `app/(auth)/login.tsx` | 153 | Version string hardcoded | Low | ✅ Fixed 2026-03-30 |
| ~~CODE-15~~ | `app/(auth)/update-password.tsx` | 4 | Two separate React imports — verified consolidated to a single `import React, { useEffect, useState } from "react"` | Low | ✅ Fixed 2026-05-07 |
| ~~CODE-16~~ | `lib/debug.ts` | 8 | `dbg()` `console.log` without `__DEV__` guard | Medium | ✅ Fixed 2026-03-30 |
| CODE-17 | `store/sessionStore.ts` | 28, 56 | Three Zustand stores in one file; `// store/...Store.ts` comments label them as separate files | Low | Open (by design — convenience grouping) |
| ~~CODE-18~~ | `app/(clinic)/_layout.tsx` | 14 | Unused `label: string` prop on `TabIcon` | Low | ✅ Fixed 2026-04-07 |
| ~~CODE-19~~ | `app/(auth)/login.tsx` | 52 | Dead `/(admin)` switch branch removed; only clinic and patient cases remain | Medium | ✅ Fixed 2026-05-07 |
| ~~CODE-20~~ | `lib/database/` | — | Orphan WatermelonDB directory deleted; `@nozbe/watermelondb` was never tracked in `package.json` so stale `node_modules` entries will sweep on the next `npm install` | Low | ✅ Fixed 2026-05-07 |
| ~~CODE-21~~ | `components/thermal/ThermalMap.tsx` | 101 | Removed unused `generateMockThermalMatrix` export | Low | ✅ Fixed 2026-05-07 |
| ~~CODE-22~~ | `app/(clinic)/_layout.tsx` | 59, 68, 86 | JSX attribute spacing fixed — added a space between `icon="..."` and `focused={focused}` on all three Tabs.Screen tabBarIcon usages. | Low | ✅ Fixed 2026-05-08 |
| ~~CODE-23~~ | `web/app/layout.tsx` | 1 | Added `// web/app/layout.tsx` file-path comment on line 1. | Low | ✅ Fixed 2026-05-08 |
| ~~CODE-24~~ | `components/feedback/FeedbackScreen.tsx` | 91 | Dropped the dead `cancelled` local + cleanup; left a comment explaining why the trailing `.catch(() => {})` exists (it silences the floating promise inside `useFocusEffect`; the actual error is captured into `loadError` state by `refreshList`). | Low | ✅ Fixed 2026-05-08 |
| ~~CODE-25~~ | `android/app/src/main/java/com/anonymous/vestigia/UVCModule.kt` | 1125 | Deleted the dead `buildUnprocessedPng` private fn + its docstring. Slot 1 is now always rendered via `buildProcessedPng(crop=null)` so the unused grayscale encoder is gone. `compileReleaseKotlin` clean in 15s. | Low | ✅ Fixed 2026-05-08 |

---

## UI / UX

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~BUG-01~~ | `app/(clinic)/pairing.tsx` | — | "Connect & Start Scanning" button had no `onPress` | Critical | ✅ Fixed 2026-03-20 |
| ~~BUG-02~~ | `app/(clinic)/live-feed.tsx` | — | "Use This Frame" button had no `onPress` | Critical | ✅ Fixed 2026-03-20 |
| ~~BUG-03~~ | `app/(clinic)/clinical-data.tsx` | — | Submit and Cancel buttons had no `onPress` handlers | Critical | ✅ Fixed 2026-03-20 |
| ~~BUG-05~~ | `app/(clinic)/live-feed.tsx` | 148–165 | Foot selector buttons had no `onPress`; active style hardcoded | Critical | ✅ Fixed 2026-03-21 |
| ~~UX-01~~ | `app/(clinic)/index.tsx` | — | Quick Action buttons had no `onPress` | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-02~~ | `app/(patient)/index.tsx` | — | Session card `onPress` missing | Medium | ✅ Fixed 2026-03-20 |
| ~~UX-03~~ | `app/(admin)/index.tsx` | — | Action buttons had no handlers | Medium | ✅ Fixed 2026-03-21 (admin moved to web) |
| ~~UX-04~~ | `app/(clinic)/settings.tsx` | — | Settings handlers were stubs | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-05~~ | `app/(patient)/settings.tsx` | — | Settings screen was a stub | Medium | ✅ Fixed 2026-03-20 |
| ~~UX-06~~ | `app/(admin)/settings.tsx` | — | Settings handlers were stubs | Medium | ✅ Fixed 2026-03-21 (admin moved to web) |
| ~~UX-07~~ | session detail screens | — | Read from `MOCK_CLINIC_SESSIONS` | High | ✅ Fixed 2026-03-21 |
| ~~UX-08~~ | admin Activate/Deactivate | — | Only called `setSelected(null)` | High | ✅ Fixed 2026-03-21 |
| ~~UX-09~~ | `app/(admin)/index.tsx` | 47–95 | No `ActivityIndicator`/error state | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-10~~ | `app/(patient)/index.tsx` | 36–68 | No error state | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-11~~ | `app/(clinic)/index.tsx` | 159–178 | Hardcoded device card | Low | ✅ Fixed 2026-05-07 (removed in commit-4 home redesign) |
| ~~UX-12~~ | `app/(admin)/settings.tsx` | 88–101 | `system_config` failure silently ignored | Low | ✅ Fixed 2026-03-21 |
| ~~UX-13~~ | `app/(clinic)/index.tsx` | 93 | "Good morning" hardcoded | Low | ✅ Fixed 2026-03-21 |
| ~~UX-14~~ | Multiple files | — | Emoji / unclear Unicode replaced with Ionicons | Medium | ✅ Fixed 2026-03-21 |
| ~~UX-15~~ | `app/(clinic)/index.tsx` | 67–95 | No `ActivityIndicator` while fetching | Low | ✅ Fixed 2026-03-30 |
| ~~UX-16~~ | `app/(clinic)/index.tsx` | 82–90 | `clinicResult.error` silently ignored | Medium | ✅ Fixed 2026-03-30 |
| ~~UX-17~~ | Multiple screens | — | Debug ID strings visible in production | Medium | ✅ Fixed 2026-03-30 |
| ~~BUG-06~~ | session detail / assessment / patient index | 22 | `THUMB_H` aspect ratio wrong | Low | ✅ Fixed 2026-04-06 |
| ~~UX-18~~ | `app/(patient)/save.tsx` | — | Orphan route deleted; `(patient)/_layout.tsx` `Tabs.Screen name="save"` entry removed | Low | ✅ Fixed 2026-05-07 |
| ~~UX-19~~ | `components/thermal/FootAngiosomeDiagram.tsx` | — | Dropped unused `asymmetry?` prop and the `AsymmetryResult` import; updated the call site in `DpnResultView.tsx` | Low | ✅ Fixed 2026-05-07 |
| ~~UX-20~~ | `web/app/admin/clinics/page.tsx` | 57 | Replaced native `confirm()` with a styled Approve confirmation modal mirroring the Reject one (cancel + Approve buttons, inline error). Reject modal also moved off `alert()` for the "Reason is required" check — error renders inline now. | Low | ✅ Fixed 2026-05-08 |
| ~~UX-21~~ | `web/app/admin/password-resets/page.tsx` | 85 | Replaced native `alert()` with an inline dismissible success banner above the queue: "Password updated for {facility}. Communicate the new password to {operator}…" — admin can dismiss with × or it stays until the next action. | Low | ✅ Fixed 2026-05-08 |

---

## Supabase / Data Integration

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~GAP-04~~ | `app/(clinic)/assessment.tsx` | 32 | Mock AI classification — replaced by real `dpnApi.scanPatient()` call (HuggingFace Spaces YOLO+sklearn fusion) | High | ✅ Fixed 2026-04-07 (FR-504) |
| ~~GAP-05~~ | `app/(clinic)/clinical-data.tsx` | — | Submit didn't write to Supabase | Critical | ✅ Fixed 2026-03-21 |
| ~~GAP-07~~ | `app/(clinic)/assessment.tsx` | — | Save to cloud never inserted | High | ✅ Fixed 2026-03-21 |
| GAP-08 | — | — | No abnormal-region overlay on thermal map | Medium | Deferred — API returns `diagnosis_factors` text only, no spatial coords |
| ~~GAP-09~~ | `app/(clinic)/history.tsx` | — | Read `MOCK_CLINIC_SESSIONS` | High | ✅ Fixed 2026-03-21 |
| ~~GAP-10~~ | `app/(admin)/users.tsx` | — | Read `MOCK_ALL_USERS` | High | ✅ Fixed 2026-03-21 |
| ~~GAP-11~~ | `app/(admin)/clinics.tsx` | — | Read `MOCK_CLINICS` + `MOCK_DEVICES` | High | ✅ Fixed 2026-03-21 |
| ~~GAP-12~~ | `app/(clinic)/index.tsx` | 58–85 | `.then()` with no error branch | Medium | ✅ Fixed 2026-03-21 |
| ~~GAP-13~~ | `app/(admin)/index.tsx` | 49–93 | `Promise.all()` no error handling | Medium | ✅ Fixed 2026-03-21 |
| ~~GAP-14~~ | `app/(patient)/index.tsx` | 37–66 | Fetches didn't destructure `error` | Medium | ✅ Fixed 2026-03-21 |
| ~~GAP-15~~ | `app/(clinic)/history.tsx` | 115–120 | PostgREST join alias mismatch | High | ✅ Fixed 2026-03-30 |
| ~~GAP-16~~ | `app/(admin)/users.tsx` | 34 | `error` not destructured | Medium | ✅ Fixed 2026-03-30 |
| ~~GAP-17~~ | `app/(admin)/clinics.tsx` | 52 | Same | Medium | ✅ Fixed 2026-03-30 |
| ~~GAP-18~~ | admin Activate/Deactivate | — | No user notification on Supabase error | Medium | ✅ Fixed 2026-04-05 |
| ~~GAP-19~~ | `app/(patient)/profile.tsx` | 200–212 | Now destructures `{ error }` and surfaces `Alert.alert("Could not deactivate", error.message)` instead of silently signing the user out. Same fix applied to clinic profile | Medium | ✅ Fixed 2026-05-07 |
| ~~GAP-20~~ | `app/(clinic)/sync.tsx` | 133 | `data_requests` insert now destructures `error` and `console.warn`s the message so failures don't disappear | Low | ✅ Fixed 2026-05-07 |
| GAP-21 | `app/(clinic)/clinical-data.tsx` | — | When `feed_mode='processed'` with no ROI, slot 2 is null and `processedPath` insert is null — verified that the bundle-viewer + PatientDetailsScreen handle this correctly | — | ✅ Verified 2026-05-07 |

---

## Performance

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~PERF-01..04~~ | session/[id], assessment, patient/index | — | `generateMockThermalMatrix` at module/component scope | Low | ✅ Fixed 2026-03-21 |
| ~~PERF-05~~ | `app.json` | 26 | `"output": "static"` SSR crash | Critical | ✅ Fixed 2026-03-21 |
| ~~PERF-06~~ | `lib/supabase.ts` | 8 | `createClient()` blocking startup | High | ✅ Fixed 2026-03-21 |
| ~~PERF-07~~ | `lib/supabase.ts` | 24 | Proxy `get` trap unbound methods | High | ✅ Fixed 2026-03-21 |
| ~~PERF-08~~ | `store/authStore.ts` | 75 | Full profile fetch on every cold start | Medium | ✅ Fixed 2026-03-21 |
| ~~PERF-09..11~~ | history / users / clinics | — | Inline arrow function in `FlatList renderItem` | Low | ✅ Fixed 2026-03-30 |
| ~~PERF-12~~ | `app/(clinic)/profile.tsx` | 198 | `successTimerRef = useRef<...>()`; cleared on unmount via a `useEffect` cleanup return | Low | ✅ Fixed 2026-05-07 |
| ~~PERF-13~~ | `app/(patient)/profile.tsx` | 178 | Same pattern | Low | ✅ Fixed 2026-05-07 |

---

## Accessibility

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~A11Y-01~~ | `app/(clinic)/live-feed.tsx` | 98–106 | "Guides" toggle no `accessibilityLabel` | Low | ✅ Fixed 2026-03-21 |
| ~~A11Y-02~~ | `app/(clinic)/index.tsx` | 45 | Chevron no accessibility role | Low | ✅ Fixed 2026-03-21 |
| ~~A11Y-03~~ | `constants/theme.ts` | 54 | `Colors.text.muted` 3.64 : 1 | Medium | ✅ Fixed 2026-03-21 |
| ~~A11Y-04~~ | `components/ui/index.tsx` | 193–201 | Muted badge text ≈ 4.4 : 1 | Low | ✅ Fixed 2026-04-07 |
| ~~A11Y-05~~ | `app/(clinic)/_layout.tsx` | 32–71 | No `tabBarAccessibilityLabel` after icons-only tabs | Medium | ✅ Fixed 2026-03-30 |
| ~~A11Y-06~~ | `constants/theme.ts` | 73 | Light `accent` `#009DAE` → `#0E7A89`. White text on accent now 5.06 : 1 (was 3.27 : 1) | Medium | ✅ Fixed 2026-05-07 |
| ~~A11Y-07~~ | `constants/theme.ts` | 120 | Dark `accent` `#26C6DA` → `#0E7A89`. White text now 5.06 : 1 (was 2.04 : 1) | High | ✅ Fixed 2026-05-07 |
| ~~A11Y-08~~ | `constants/theme.ts` | 92 | `warning` `#F59E0B` → `#B45309`. On white now 5.03 : 1 (was 2.14 : 1) | High | ✅ Fixed 2026-05-07 |
| ~~A11Y-09~~ | `constants/theme.ts` | 91 | `error` `#EF4444` → `#B91C1C`. On white now 6.46 : 1 (was 3.76 : 1) | Medium | ✅ Fixed 2026-05-07 |
| ~~A11Y-10~~ | `app/(clinic)/request-password-reset.tsx` | 56 | Added `accessibilityLabel="Back"` + `accessibilityRole="button"` to the header back-arrow `TouchableOpacity`. | Low | ✅ Fixed 2026-05-08 |
| ~~A11Y-11~~ | `components/feedback/FeedbackScreen.tsx` | 140 | Same fix on the shared feedback screen — fixes both clinic and patient feedback routes. | Low | ✅ Fixed 2026-05-08 |

---

## Security

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~SEC-01~~ | `store/authStore.ts` | — | Mock service-role bypass | Critical | ✅ Fixed 2026-03-20 |
| ~~SEC-02~~ | All tables | — | RLS INSERT WITH CHECK clauses missing | High | ✅ Fixed 2026-03-20 |
| ~~SEC-03~~ | `app/(clinic)/clinical-data.tsx` | 76–106 | HR + HbA1c no range validation | Medium | ✅ Fixed 2026-03-21 |
| ~~SEC-04~~ | `lib/profile/avatarUpload.ts` | 60 | Avatar upload writes to `<userId>/avatar.jpg` but `avatars_write` RLS policy required `profiles/<auth.uid()>/...` — every upload was rejected | Medium | ✅ Fixed 2026-05-07 (path now `profiles/${userId}/avatar.jpg`) |
| ~~SEC-05~~ | `supabase/migrations/20260507130000_avatars_bucket_public.sql` | — | `avatars` bucket was private → `getPublicUrl()` returned a URL that could not load. Bucket flipped to public; RLS still gates writes | Low | ✅ Fixed 2026-05-07 |
| SEC-06 | `supabase/functions/admin-set-clinic-password/index.ts` | — | Verified end-to-end — caller JWT validated via `auth.getUser()`; admin role checked via service-role read of `profiles.role` BEFORE any privileged action; UUIDs validated; password length enforced (≥ 8); `clinic_profile_id` of the request row must match the body's `profile_id`; pending-only state guard prevents double-resolution; password update + row stamp are sequenced so a stamp failure does not leave the password un-changed. CORS wildcard is intentional (admin web may be deployed at multiple origins). | — | ✅ Verified 2026-05-08 |

---

## Navigation

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| NAV-01 | `app/(clinic)/assessment.tsx` | — | No back navigation | Low | Open (by design) |
| ~~NAV-02~~ | `app/index.tsx` | 20 | `router.replace()` fired before Root Layout mounted | High | ✅ Fixed 2026-03-21 |
| ~~NAV-03~~ | `app/(patient)/settings.tsx` | — | Patient settings unreachable | Medium | ✅ Fixed 2026-03-30 |
| ~~NAV-04~~ | 5 screens | — | Missing back buttons | Medium | ✅ Fixed 2026-04-07 |
| ~~NAV-05~~ | `app/(auth)/login.tsx` | 52 | = CODE-19 | Medium | ✅ Fixed 2026-05-07 |
| ~~NAV-06~~ | `app/(patient)/save.tsx` | — | = UX-18 | Low | ✅ Fixed 2026-05-07 |
| ~~NAV-07~~ | `app/(clinic)/index.tsx`, `app/(patient)/index.tsx` | — | New home screens pushed `?sessionId=…` (camelCase) but bundle-detail read `session_id` (snake_case); empty fallback reached Postgres as `eq("id", "")` and surfaced as "invalid input syntax for type uuid: ''" | High | ✅ Fixed 2026-05-07 |

---

## Auth (History)

| ID | File | Issue | Status |
|---|---|---|---|
| ~~AUTH-01~~ | `authStore.ts` | `resetPasswordForEmail` missing `redirectTo` | ✅ Fixed 2026-03-20 |
| ~~AUTH-02~~ | `(auth)/` | `update-password.tsx` missing | ✅ Fixed 2026-03-20 |
| ~~AUTH-03~~ | `_layout.tsx` | Deep link handler missing | ✅ Fixed 2026-03-20 |
| ~~AUTH-04~~ | `register.tsx` | Password validation showed errors one at a time | ✅ Fixed 2026-03-20 |
| ~~AUTH-05~~ | `authStore.ts` | Mock accounts | ✅ Fixed 2026-03-20 |
| ~~AUTH-06~~ | `authStore.ts` | No login lockout | ✅ Fixed 2026-03-20 |
| ~~AUTH-07~~ | — | Admin registration unclear | ✅ By design — admin via dashboard / web app only |
| ~~AUTH-08~~ | `login.tsx` | Login rejected valid passwords < 8 chars | ✅ Fixed 2026-03-20 |
| ~~AUTH-09~~ | `login.tsx`, `register.tsx` | Unknown role caused silent freeze | ✅ Fixed 2026-03-20 |
| ~~AUTH-10~~ | `register.tsx` | `selectedClinicId` not reset on role switch | ✅ Fixed 2026-03-20 |
| ~~AUTH-11~~ | `update-password.tsx` | No session guard | ✅ Fixed 2026-03-20 |
| ~~AUTH-12~~ | `_layout.tsx` | Deep link handler too broad | ✅ Fixed 2026-03-20 |
| ~~AUTH-13~~ | `authStore.ts` | `onAuthStateChange` subscription leaked | ✅ Fixed 2026-03-20 |
| ~~AUTH-14~~ | `authStore.ts` | `pendingClinicId` for all roles; `logout()` missing try-finally | ✅ Fixed 2026-03-20 |
| ~~AUTH-15~~ | `authStore.ts` | `PGRST116` not mapped to friendly error | ✅ Fixed 2026-03-20 |
| ~~AUTH-16~~ | `store/authStore.ts` | Clinic-approval gate added — `login()` now reads `clinics.approval_status` for the clinic owner; `pending` and `rejected` clinics are signed out with a clear message; auto-sign-in removed from `registerClinic()` so freshly registered clinics land on `clinic-pending-approval` instead | ✅ Fixed 2026-05-07 |
| ~~BUG-04~~ | `app/_layout.tsx` | No inactivity timeout | ✅ Fixed 2026-03-21 |

---

## Schema / Database

| ID | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| ~~DB-01~~ | Supabase | — | Tables not verified vs thesis schema | High | ✅ Fixed 2026-03-20 |
| ~~DB-02~~ | Supabase | — | RLS not verified | High | ✅ Fixed 2026-03-20 |
| GAP-06 / DB-03 | — | — | WatermelonDB sync deferred (replaced by `expo-sqlite`); see CODE-20 to clean up the orphan files | High | ✅ Resolved by replacement; cleanup pending |
| DB-04 | — | — | Conflict resolution for offline ↔ remote sync | Medium | Deferred |
| ~~GAP-01~~ | `lib/thermal/bleCamera.ts` | — | BLE scan was mock | High | ✅ Fixed 2026-04-06 |
| ~~GAP-02~~ | `lib/thermal/wifiCamera.ts` | — | Wi-Fi WebSocket not implemented | High | ✅ Fixed 2026-04-06 |
| ~~GAP-03~~ | `app/(clinic)/live-feed.tsx` | — | Frames from mock setInterval | High | ✅ Fixed 2026-04-06 |
| ~~HW-01~~ | `android/.../UVCModule.kt` | — | Stubbed UVC module | High | ✅ Fixed 2026-04-08 |
| ~~DB-05~~ | `supabase/migrations/20260507120000_add_feed_mode_to_thermal_captures.sql` | — | Added `feed_mode TEXT NOT NULL DEFAULT 'unprocessed'` + relaxed `processed_image_path` NOT NULL so the new 3-slot pipeline can store rows where slot 2 is null | — | ✅ Applied 2026-05-07 |
| ~~DB-06~~ | `supabase/migrations/20260507130000_avatars_bucket_public.sql` | — | Flip `avatars` bucket public | — | ✅ Applied 2026-05-07 |
| ~~DB-07~~ | `supabase/migrations/20260508_admin_gating_and_tickets.sql` | — | New: `clinics.approval_status` (+ `approved_by` / `approved_at` / `rejection_reason`); `clinic_password_reset_requests` + RLS; `support_tickets` + RLS; RPCs `submit_password_reset_request`, `submit_support_ticket`, `admin_approve_clinic`, `admin_reject_clinic`, `admin_resolve_ticket`. Existing clinics back-filled to `approval_status='approved'`. Trigger `clinics_block_non_admin_approval_change` fences the new admin-only columns from non-admin updates. | — | ✅ Applied 2026-05-07 |
| ~~DB-08~~ | `supabase/migrations/20260507120000_add_feed_mode_to_thermal_captures.sql` | — | Docstring rewritten to describe the new symmetric semantics of `feed_mode`: 'unprocessed' = Raw mode, 'processed' = Enhanced mode; both produce (full, cropped or null, isolated). No SQL change — the existing CHECK constraint and nullable `processed_image_path` are still correct. | — | ✅ Updated 2026-05-08 |

---

## Thermal Pipeline / Isolation

| ID | File | Issue | Severity | Status |
|---|---|---|---|---|
| ~~ISO-01~~ | `UVCModule.kt`, `lib/thermal/footIsolation.ts` | Cold subject inverted polarity | High | ✅ Fixed v0.9.9 — border-polarity component selection |
| ~~ISO-02~~ | same | Thin structure severed before closing | High | ✅ Fixed v0.9.9 — closing before BFS |
| ~~ISO-03~~ | same | Coloured fringe residue | Medium | ✅ Fixed v0.9.9 — opening after BFS |
| ~~ISO-04~~ | `UVCModule.kt` | Variance guardrail empirical | Low | ✅ Resolved 2026-05-07 — superseded by ROI moat sampler + one-sided threshold |
| ~~ISO-05~~ | `UVCModule.kt` | Internal "donut" hole inside warm foot remained even after closing morph | High | ✅ Fixed 2026-05-07 — new `fillHoles()` helper does 4-connect BFS from frame border on the inverse mask |
| ~~ISO-06~~ | `UVCModule.kt` | When the foot extended past the framing rectangle, `bgMedian` over the entire outside region was pulled toward the foot's own temperature; threshold ballooned and most of the foot fell below it | High | ✅ Fixed 2026-05-07 — moat sampler reads only the thin ring outside the ROI |
| ~~ISO-07~~ | `UVCModule.kt`, `lib/thermal/captureProcessor.ts`, `lib/thermal/uvcCamera.ts`, `lib/thermal/bundleStorage.ts`, `app/(offline)/patient-details.tsx`, `components/thermal/OnlineBundleDetailScreen.tsx`, `components/thermal/BundleDetailScreen.tsx` | Symmetric 3-slot pipeline: `processCapture` derives `feedMode` from the `enhanced` flag; `processThermalFrames`'s divergent branches collapsed into one uniform path producing slot 1 = palette full, slot 2 = palette cropped (null when no ROI), slot 3 = isolated cropped. Bundle viewers (online + offline) read `feed_mode` and render RAW/ENHANCED labels. Offline `ThermalBundle` now persists `feed_mode`; `FootData.processed_image_b64` is nullable. | — | ✅ Applied 2026-05-08 |
| ~~ISO-08~~ | `android/app/src/main/res/mipmap-*/ic_launcher*.webp`, `android/app/src/main/res/values/colors.xml`, `values-night/colors.xml` | Re-ran `npx expo prebuild --platform android --no-install` to regenerate the 25 baked-in launcher webp files (5 sizes × 5 variants) from the LumenAI adaptive-icon paths in `app.json` — the create-expo-app default blue triangle was sticking around because prebuild had not been re-run since the brand assets were swapped. Splash colours `splashscreen_background` (light/dark) also picked up the teal values from app.json. UVCModule.kt and the rest of the java source were untouched. | — | ✅ Applied 2026-05-08 |

---

## Tracking

| Area | Total | Open | Fixed | Deferred |
|---|---|---|---|---|
| Code Quality | 25 | 1 | 23 | 1 (CODE-17 by design) |
| UI / UX | 26 | 0 | 26 | 0 |
| Supabase / Data | 17 | 0 | 15 | 2 (GAP-08) |
| Performance | 13 | 0 | 13 | 0 |
| Accessibility | 11 | 0 | 11 | 0 |
| Security | 6 | 0 | 6 | 0 |
| Navigation | 7 | 1 | 6 | 0 (NAV-01 by design) |
| Auth | 17 | 0 | 17 | 0 |
| Schema / DB | 13 | 0 | 12 | 1 (DB-04) |
| Thermal Isolation | 8 | 0 | 8 | 0 |
| **Total** | **143** | **2** | **137** | **4** |

**Overall QA status:** CODE-25 (the lone new finding from this sweep) closed in the same session; the symmetric pipeline change (ISO-07) and launcher-icon regen (ISO-08) are recorded as resolved. 137 of 143 actionable items now fixed. The 2 remaining "Open" rows are by design (CODE-17 — three Zustand stores grouped in `store/sessionStore.ts`; NAV-01 — `(clinic)/assessment.tsx` has no back arrow on the wait-for-inference screen).

The 4 deferred rows depend on external work:
- **GAP-08** — per-angiosome spatial overlay; deferred until the DPN API exposes per-region coordinates.
- **DB-04** — formal offline ↔ remote conflict-resolution policy.
- **CODE-09 / GAP-04** — already resolved by FR-504 (real DPN API).
