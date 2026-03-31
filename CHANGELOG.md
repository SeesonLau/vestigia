# Changelog — Vestigia

All notable changes to this project will be documented here.
Format: `Major.Minor.Patch`

## [0.5.3] — 2026-03-30

### Fixed — QA Sweep
- **UX-17** `app/(clinic)/pairing.tsx`, `patient-select.tsx`, `live-feed.tsx`, `assessment.tsx`, `clinical-data.tsx`, `history.tsx`, `settings.tsx`, `app/(admin)/index.tsx` — Removed all debug subtitle strings (`"UI-02"` through `"UI-08"`) from Header components; no longer visible in production
- **GAP-15** `app/(clinic)/history.tsx` — Fixed PostgREST join normalization; `getClassification()` helper now handles both array and object join results; positive/negative session counts now accurate
- **GAP-16** `app/(admin)/users.tsx` — `fetchUsers()` now destructures `error`; shows `fetchError` state to user on failure
- **GAP-17** `app/(admin)/clinics.tsx` — `fetchClinics()` same fix as GAP-16
- **UX-15** `app/(clinic)/index.tsx` — Added `statsLoading` state + `ActivityIndicator` while today's stats load
- **UX-16** `app/(clinic)/index.tsx` — Added `statsError` state + visible error text when clinic/sessions fetch fails
- **CODE-16** `lib/debug.ts` — `dbg()` now guards with `if (!__DEV__) return`; no debug logs in production builds
- **A11Y-05** `app/(clinic)/_layout.tsx` — Added `tabBarAccessibilityLabel` to all 5 `Tabs.Screen` entries
- **CODE-14** `app/(auth)/login.tsx` — Version string updated to `v0.5.2`
- **NAV-03** `app/(patient)/index.tsx` — Settings icon added to patient dashboard header; `/(patient)/settings` now reachable
- **PERF-09** `app/(clinic)/history.tsx` — `renderItem` extracted into `useCallback`
- **PERF-10** `app/(admin)/users.tsx` — `renderItem` extracted into `useCallback`
- **PERF-11** `app/(admin)/clinics.tsx` — `renderItem` extracted into `useCallback`

---

## [0.5.2] — 2026-03-24

### Fixed
- **assessment.tsx** — Added unmount cleanup `useEffect` that calls `clearSession()` + `discardCapture()` if user navigates away before saving; guards stale session state
- **patient-select.tsx** — Replaced two-state client-side `.filter()` + second `useEffect` with single Supabase `.ilike()` query on `patient_code`; scales to any number of patients

### Added
- **types/index.ts** — `risk_level?: "LOW" | "MEDIUM" | "HIGH"` added to `ClassificationResult`; ready for FR-508

### Documentation
- Full codebase QA audit run; 0 regressions found; 21 open issues confirmed (no change from v0.5.1)
- All progress docs (`qa-bugs.md`, `ui-checklist.md`, `fr-checklist.md`, `data-checklist.md`) updated to 2026-03-24

---

## [0.5.1] — 2026-03-21

### Changed
- `app/(clinic)/_layout.tsx` — Removed text labels from tab bar icons (icon-only navigation)
- `app/(clinic)/_layout.tsx` — `patient-select` hidden from tab bar; accessible only via Home quick actions

---

## [0.5.0] — 2026-03-21

### Added
- `lib/debug.ts` — timestamped debug logger `dbg(tag, msg, data?)` using `APP_START` baseline for relative timing; used across auth, screens, and stores to trace cold-start sequence

### Fixed — Supabase Backend Wiring
- **GAP-07** `app/(clinic)/assessment.tsx` — "Save to Cloud" now inserts to `classification_results` and updates `screening_sessions.status = "completed"`
- **GAP-09** `app/(clinic)/history.tsx` — Replaced `MOCK_CLINIC_SESSIONS` with live Supabase query filtered by `clinic_id`
- **GAP-10** `app/(admin)/users.tsx` — Replaced `MOCK_ALL_USERS` with real `profiles` table query; Activate/Deactivate now calls `supabase.from("profiles").update()`
- **GAP-11** `app/(admin)/clinics.tsx` — Replaced `MOCK_CLINICS` + `MOCK_DEVICES` with real `clinics` + `devices` tables; Activate/Deactivate wired to Supabase
- **UX-07** `app/(clinic)/session/[id].tsx` + `app/(patient)/session/[id].tsx` — Both session detail screens now load real session from Supabase joining `classification_results`, `patient_vitals`, `thermal_captures`
- **UX-08** `app/(admin)/users.tsx` + `app/(admin)/clinics.tsx` — Activate/Deactivate modal buttons now call Supabase `.update()` instead of only closing modal
- **CODE-11** `app/(clinic)/index.tsx` — Clinic name and today's session stats now loaded from Supabase (`clinics` + `screening_sessions` tables); removed hardcoded "Cebu City Health Center"
- **BUG-05** `app/(clinic)/live-feed.tsx` — Foot selector buttons wired with `onPress`; active style now mirrors `selectedFoot` state correctly
- `app/(admin)/index.tsx` — Overview stats (sessions, positive cases, clinics, users) wired to real Supabase counts (S-01)
- `app/(admin)/index.tsx` — Clinic cards on admin dashboard now navigate to `/(admin)/clinics` on tap (N-02)

### Fixed — Startup Performance
- **PERF-05** `app.json` — `"output": "static"` → `"output": "single"`; removes Expo Router Node.js SSR pre-render; fixes `window is not defined` crash on Metro start
- **PERF-06** `lib/supabase.ts` — Supabase client lazy-initialized via `Proxy`; defers `createClient()` and `AsyncStorage` initialization until first use; eliminates 5+ second startup block
- **PERF-07** `lib/supabase.ts` — Proxy `get` trap binds methods to client instance; fixes silent failures from lost `this` context on `supabase.from()` calls
- **PERF-08** `store/authStore.ts` — Removed blocking `getSession()` call; auth now resolved via `INITIAL_SESSION` event using JWT `user_metadata`; cold start reduced to <1 second with no DB round-trip
- **NAV-02** `app/index.tsx` — Replaced `useEffect + router.replace()` with `<Redirect>` component; fixes "Attempted to navigate before mounting Root Layout" crash on cold start

### Fixed — UX
- **UX-14** Icon standardization — All emoji characters and unclear Unicode symbols (`⌂ ◈ 📷 📋 ⚙ 📡 🧠 ⏱ 📊 📄 ⚠ ✓ › ← →`) replaced with `@expo/vector-icons` Ionicons across all 20 affected files; brand logo `◈` in auth screens replaced with `pulse-outline` Ionicons
- `app/(patient)/index.tsx` — Added `PGRST116` guard; no linked patient record now shows empty state instead of error screen
- `app/(clinic)/index.tsx` + `app/(patient)/index.tsx` — Logout button added to header via `rightIcon` prop using `Ionicons log-out-outline`
- `app/(clinic)/_layout.tsx` — `TabIcon` component rewritten to use `<Ionicons>` with typed `keyof typeof Ionicons.glyphMap` prop; removed `<Text>` emoji rendering

---

## [0.4.0] — 2026-03-21

### Added
- `hooks/useInactivityTimeout.ts` — 30-minute inactivity session timeout (FR-104, BUG-04); resets on touch, logs out if app backgrounded ≥30 min; wired in `app/_layout.tsx` via `View.onTouchStart`

### Fixed
- **UX-04** `app/(clinic)/settings.tsx` — All handlers wired: Sign Out (confirm dialog), Change Password → update-password, Paired Device/Scan → pairing, Clear Cache (destructive confirm), Delete Account (destructive confirm); all emoji icons replaced with Ionicons
- **UX-06** `app/(admin)/settings.tsx` — Sign Out with confirmation dialog, Change Password → update-password, all stub handlers → "Coming Soon" alerts; emoji icons replaced with Ionicons
- **CODE-02** — Audited all `console.` usage across 51 files; only non-sensitive `console.error` in WatermelonDB setup; no sensitive data logged

### Documentation
- `_project-docs/progress/qa-bugs.md` — Full codebase audit: 55 total issues tracked (37 fixed, 18 open); new findings: BUG-05, GAP-09–11, UX-07 expanded, UX-08, CODE-11
- `.claude/commands/end-session.md` — Added steps 8 (qa-bugs.md sync) and 9 (session log creation)
- `_project-docs/how-to-use.md` — Updated to reflect new /end-session behavior and sessions/ folder

---

## [0.3.0] — 2026-03-20

### Added
- `app/(auth)/account-activated.tsx` — Account activation success screen shown after email confirmation on mobile; routes to login on button press
- `supabase/functions/auth-redirect/index.ts` — Edge Function serving a Vestigia-themed HTML redirect page: auto-opens the app on mobile, shows "Open on Your Phone" on desktop
- `app/(patient)/settings.tsx` — Patient settings screen with Edit Profile, Change Password, Notifications, and Sign Out

### Fixed
- `_layout.tsx` deep link handler now routes email confirmation to `/(auth)/account-activated` instead of directly to dashboard
- `_layout.tsx` deep link handler handles both implicit (`#access_token`) and PKCE (`?code=`) confirmation flows
- `store/authStore.ts` — `emailRedirectTo` in `signUp` now points to Edge Function URL so confirmation email opens the app, not a Supabase web page

---

## [0.2.0] — 2026-03-20

### Added
- `app/(auth)/update-password.tsx` — Password reset screen (AUTH-02)
- `app/(auth)/forgot-password.tsx` — Ionicons for lock/mail/back icons
- `app/(auth)/register.tsx` — Ionicons for role selector and password toggle
- `app/(auth)/login.tsx` — Ionicons for password toggle eye icon
- Client-side rate limiting on login: 5 failed attempts → 30-second lockout (AUTH-06)
- `supabase/functions/auth-redirect/` directory structure initialized

### Fixed
- **AUTH-04** `register.tsx` — Password validation now shows all failing rules simultaneously instead of only the last one
- **AUTH-08** `login.tsx` — Login no longer blocks users with valid passwords under 8 characters; only checks field is non-empty
- **AUTH-09** `login.tsx`, `register.tsx` — Added `default` case to role routing switches; unknown roles fall back to login instead of silent freeze
- **AUTH-10** `register.tsx` — `selectedClinicId` resets when switching between Patient and Clinic roles
- **AUTH-11** `update-password.tsx` — Session guard on mount; shows error and disables form if no valid reset token present
- **AUTH-12** `_layout.tsx` — Deep link condition narrowed from overly broad `includes()` check to exact `vestigia://update-password` + `access_token` match
- **AUTH-13** `authStore.ts` — `onAuthStateChange` subscription stored in module-level variable and cleaned up on re-init (guards HMR double-subscribe)
- **AUTH-14** `authStore.ts` — `pendingClinicId` only stored when registering role is `clinic`; `logout()` uses `try-finally` so local state always clears
- **AUTH-15** `authStore.ts` — PostgREST `PGRST116` (no profile row) mapped to friendly "Account setup is incomplete" message
- **AUTH-01** `authStore.ts` — `resetPasswordForEmail` now includes `redirectTo: 'vestigia://update-password'`
- **AUTH-03** `_layout.tsx` — Deep link handler added for password reset (`type=recovery`) and email confirmation flows
- **AUTH-05** `authStore.ts` — Mock accounts fully removed; all auth through Supabase
- `components/layout/ScreenWrapper.tsx` — Replaced deprecated `SafeAreaView` from `react-native` with `SafeAreaView` from `react-native-safe-area-context`
- `store/authStore.ts` — Graceful error handling for 504/503/502, network errors, rate limits, and raw PostgREST messages via `mapAuthError()`
- `babel.config.js` — Removed duplicate `@babel/plugin-proposal-decorators` and `@babel/plugin-proposal-class-properties` that caused "Cannot assign to read-only property 'NONE'" crash
- `app/(clinic)/pairing.tsx` — BUG-01: "Proceed" button now navigates to `/(clinic)/live-feed`
- `app/(clinic)/live-feed.tsx` — BUG-02: "Use This Frame" navigates to `/(clinic)/clinical-data`; thermalStore wired
- `app/(clinic)/clinical-data.tsx` — BUG-03: Submit navigates to `/(clinic)/assessment`; Cancel returns to `/(clinic)`
- Input fields across all auth screens — removed label props, use placeholder text only
- `types/index.ts` — Added missing fields: `AuthUser.phone`, `ScreeningSession.app_version`, `PatientVitals.recorded_at`, `ThermalCapture.resolution_x/y`, `ClassificationResult.feature_vector`

---

## [0.1.0] — 2026-03-20

### Added
- Initial UI implementation for all three roles: Clinic, Patient, Admin
- Expo Router file-based navigation with role-based route groups
- Zustand stores: authStore, sessionStore, deviceStore, thermalStore
- Supabase authentication integration (login, register, logout, session restore, password reset)
- Custom theme system (dark navy + teal palette) in `constants/theme.ts`
- Component library: ScreenWrapper, Card, Badge, Button, Input, ThermalMap, ClassificationCard, etc.
- Mock data system for dev/demo (`data/mockData.ts`)
- TypeScript type definitions (`types/`)
- CLAUDE.md with session protocols, coding standards, and memory bank system
- Memory bank (`memory-bank/`) with 8 project context files
- CHANGELOG.md (this file)
- MCP connection to Supabase via postgres pooler
- File path comments on all source files
- Coding standards, security rules, and comment style guide in CLAUDE.md

### Architecture
- React Native 0.81.5 + Expo 54 + Expo Router 6
- Supabase project: `yqgpykyogvoawlffkeoq` (ap-northeast-2)
- 8 database tables confirmed: profiles, patients, clinics, devices, patient_vitals, screening_sessions, thermal_captures, classification_results

---
