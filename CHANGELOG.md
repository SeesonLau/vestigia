# Changelog — Vestigia

All notable changes to this project will be documented here.
Format: `Major.Minor.Patch`

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

## [push] — 2026-03-20

### Fixed
- FIX: clear session and thermal state on assessment exit (CODE-10)
- FIX: wire admin dashboard action buttons (UX-03)
- FIX: patient session cards now navigate to session detail screen (UX-02)

### Changed
- chore: update changelog [skip ci]
- chore: update changelog [skip ci]

---

## [push] — 2026-03-20

### Fixed
- FIX: wire admin dashboard action buttons (UX-03)
- FIX: patient session cards now navigate to session detail screen (UX-02)

### Changed
- chore: update changelog [skip ci]

---

## [push] — 2026-03-20

### Fixed
- FIX: patient session cards now navigate to session detail screen (UX-02)

---

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
