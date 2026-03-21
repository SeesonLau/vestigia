# Active Context — Vestigia
**Last updated:** 2026-03-21

---

## What Was Done This Session (2026-03-21 — v0.4.0)

### UX-04 — Clinic Settings Screen (fully rewritten)
- All `onPress` stubs wired
- Sign Out: confirmation dialog → `logout()` → replace to `/(auth)/login`
- Change Password: navigates to `/(auth)/update-password`
- Paired Device / Scan for New Device: navigates to `/(clinic)/pairing`
- Clear Local Cache: destructive confirmation dialog
- Delete Account: destructive confirmation dialog
- All remaining stubs → `Alert.alert("Coming Soon", ...)`
- All emoji icons replaced with Ionicons
- App version footer updated to 0.3.0

### UX-06 — Admin Settings Screen (fully rewritten)
- Sign Out: confirmation dialog → `logout()` → replace to `/(auth)/login`
- Change Password: navigates to `/(auth)/update-password`
- All stub `onPress` → `Alert.alert("Coming Soon", ...)` with feature names
- All emoji icons replaced with Ionicons
- App version footer updated to 0.3.0

### CODE-02 — console.log Audit
- Grep'd all .ts/.tsx files for `console.`
- Found only 1 instance: `console.error` in `lib/database/index.ts` (WatermelonDB setup error — no sensitive data)
- Clean. No sensitive auth/patient data logged anywhere.

### BUG-04 — 30-Minute Inactivity Session Timeout (FR-104)
- Created `hooks/useInactivityTimeout.ts`:
  - `setTimeout(forceLogout, 30min)` resets on every call to `resetTimer()`
  - `AppState` listener: if app was backgrounded ≥30 min, logs out on return
  - Timer cleared when user is null (logged out)
- Wired in `app/_layout.tsx`: root `View` wraps `Stack` with `onTouchStart={resetTimer}` — any touch anywhere in the app resets the timer

### Full Codebase QA Audit
- Read all 51 source files (100% coverage)
- New bugs discovered: BUG-05, GAP-09, GAP-10, GAP-11, UX-07 (expanded), UX-08, CODE-11
- `_project-docs/progress/qa-bugs.md` updated: 55 total issues, 37 fixed, 18 open

### /end-session Command Updated
- Added Step 8: update `qa-bugs.md` (mark fixes, add bugs, sync counts)
- Added Step 9: create session log in `_project-docs/sessions/YYYY-MM-DD-vX.X.X.md`

### how-to-use.md Updated
- `/end-session` row updated to mention qa-bugs.md and session log
- Update workflow step 4 updated
- Session workflow diagram updated
- File tree updated to include `_project-docs/sessions/`

---

## Current State

### Auth
- ✅ Login, register, logout, session restore all working
- ✅ Password reset + email confirmation deep links working
- ✅ Rate limiting, error mapping, session guards — all done
- ✅ Mock accounts fully removed

### App
- ✅ Full clinic screening flow: Dashboard → Pair → Patient Select → Live Feed → Clinical Data → Assessment
- ✅ Patient select fetches real Supabase patients by clinic_id
- ✅ Clinical data submit writes to `screening_sessions`, `patient_vitals`, `thermal_captures`
- ✅ Assessment exit calls `clearSession()` + `discardCapture()`
- ✅ 30-minute inactivity timeout on all roles
- ✅ Clinic settings screen — all handlers wired
- ✅ Admin settings screen — all handlers wired
- ✅ Patient settings screen — all handlers wired
- ✅ All role dashboards navigable; admin tabs all reachable
- ❌ Live-feed foot selector buttons broken (BUG-05)
- ❌ History/session detail/admin screens still serve mock data (GAP-09, GAP-10, GAP-11, UX-07, UX-08)
- ❌ Assessment "Save to Cloud" doesn't write to classification_results (GAP-07)
- ❌ Clinic dashboard shows hardcoded clinic name (CODE-11)
- ❌ WatermelonDB not installed
- ❌ BLE/Wi-Fi device comms deferred (hardware not finalized)

### Pending Supabase Dashboard Steps
- Add Edge Function URL to Redirect URLs (still pending from last session)
- Deploy Edge Function: `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`

---

## Next Steps (priority order)
1. **BUG-05** — Fix foot selector `onPress` in live-feed.tsx (30 min)
2. **UX-07** — Wire session detail screens to real Supabase data (2–3 hrs)
3. **GAP-09** — Wire history.tsx to real Supabase sessions (1–2 hrs)
4. **CODE-11** — Fetch real clinic name from Supabase on clinic dashboard (30 min)
5. **GAP-07** — Wire assessment Save button to `classification_results` insert (1 hr)
6. **UX-08 + GAP-10/11** — Wire admin users/clinics screens to Supabase (3–5 hrs)
7. Hardware integration (GAP-01–04) — deferred

---

## Open Questions
- What is the AI classification model — local inference or cloud API?
- Is BLE device hardware finalized? (deferred)
