# Active Context — Vestigia
**Last updated:** 2026-03-21

---

## What Was Done This Session (2026-03-21 — v0.5.0)

### Startup Performance Overhaul
- **PERF-05** `app.json` — changed `"output": "static"` → `"output": "single"`; eliminates Expo Router SSR Node.js pre-render that caused `window is not defined` crash
- **PERF-06/07** `lib/supabase.ts` — Rewrote to lazy-init Supabase client via `Proxy`; defers `createClient()` until first property access; Proxy `get` trap binds methods to client instance to fix `this` context loss
- **PERF-08** `store/authStore.ts` — Removed blocking `getSession()` call; auth now resolved via `INITIAL_SESSION` event using JWT `user_metadata`; no DB round-trip on cold start; startup time reduced from 5+ seconds to <1 second
- **NAV-02** `app/index.tsx` — Replaced `useEffect + router.replace()` with `<Redirect>` component from expo-router; fixes "Attempted to navigate before mounting Root Layout" crash

### Debug Logging
- Created `lib/debug.ts` — timestamped logger using `APP_START = Date.now()` baseline; `dbg(tag, msg, data?)` logs relative elapsed time; used in auth, screens, and stores

### Patient Dashboard Hardening
- Added `PGRST116` guard in `app/(patient)/index.tsx` — if no patient record is linked to auth user, shows empty state (not error); handles newly registered users gracefully

### Logout Buttons
- Added logout button to clinic home (`app/(clinic)/index.tsx`) header via `rightIcon` prop
- Added logout button to patient dashboard (`app/(patient)/index.tsx`) header via `rightIcon` prop (all 3 render states: loading, error, main view)

### Supabase Backend Wiring (committed in same session, pre-compaction)
- **GAP-07** assessment "Save to Cloud" → `classification_results` insert + session status update
- **GAP-09** history screen → real `screening_sessions` by `clinic_id`
- **GAP-10** admin users → real `profiles` table + Activate/Deactivate wired
- **GAP-11** admin clinics → real `clinics` + `devices` + Activate/Deactivate wired
- **UX-07** both session detail screens → real Supabase joins
- **UX-08** admin modal buttons → Supabase `.update()`
- **CODE-11** clinic dashboard → real clinic name + today's stats
- **BUG-05** live-feed foot selector → `onPress` wired, active style mirrors state
- Admin overview stats wired (S-01); admin clinic cards navigate to clinics tab (N-02)

### Icon Standardization (UX-14)
- `app/(clinic)/_layout.tsx` — `TabIcon` component rewritten to use `<Ionicons>` with typed `keyof typeof Ionicons.glyphMap`; tabs: `home-outline`, `bluetooth-outline`, `camera-outline`, `time-outline`, `settings-outline`
- `app/(auth)/login.tsx` + `app/(auth)/register.tsx` — `◈` brand logo → `pulse-outline`
- `app/(clinic)/pairing.tsx` — `◈` device icon → `hardware-chip-outline`; `📡` empty state → `radio-outline`; `✓` paired banner → `checkmark-circle-outline`
- `app/(clinic)/assessment.tsx` — `🧠` → `analytics-outline`; `⏱` → `timer-outline`; `✓` saved banner → `checkmark-circle-outline`; `↑` button label removed
- `app/(clinic)/history.tsx` — `📋` empty state → `time-outline`
- `app/(clinic)/session/[id].tsx` — `←` back button → `arrow-back-outline`
- `app/(clinic)/settings.tsx` — `›` chevrons → `chevron-forward`
- `app/(clinic)/live-feed.tsx` + `app/(clinic)/clinical-data.tsx` + `app/(clinic)/pairing.tsx` — `→` button labels removed
- `app/(clinic)/index.tsx` — `›` action chevron → `chevron-forward`
- `app/(admin)/index.tsx` — `📊 Export CSV` → `bar-chart-outline`; `📄 Export PDF` → `document-text-outline`; `→` config link → `chevron-forward`
- `app/(admin)/clinics.tsx` — `›` chevron → `chevron-forward`; `◈` device code → `hardware-chip-outline`
- `app/(admin)/settings.tsx` — `›` chevrons → `chevron-forward`
- `app/(patient)/index.tsx` — `⚠` / `✓` → `warning-outline` / `checkmark-circle-outline`
- `app/(patient)/session/[id].tsx` — `←` back button → `arrow-back-outline`

---

## Current State

### Auth
- ✅ Login, register, logout, session restore all working
- ✅ Password reset + email confirmation deep links working
- ✅ Rate limiting, error mapping, session guards — all done
- ✅ Mock accounts fully removed
- ✅ Cold start <1 second (no blocking DB call)

### App
- ✅ Full clinic screening flow: Dashboard → Pair → Patient Select → Live Feed → Clinical Data → Assessment
- ✅ Assessment result saved to `classification_results`
- ✅ Session detail screens read real Supabase data (both clinic + patient)
- ✅ History screen reads real sessions from Supabase
- ✅ Admin users + clinics screens read from Supabase; Activate/Deactivate wired
- ✅ Admin overview stats wired to Supabase
- ✅ 30-minute inactivity timeout on all roles
- ✅ All settings screens fully wired
- ✅ All icons are Ionicons — no emoji or unclear Unicode symbols anywhere
- ✅ Logout buttons on clinic home + patient dashboard
- ❌ No abnormal region overlay on thermal map (GAP-08 — deferred)
- ❌ BLE/Wi-Fi device comms deferred (hardware not finalized)
- ❌ AI classification is mock (GAP-04 — hardware/API dependency)

### Pending Supabase Dashboard Steps
- Add Edge Function URL to Redirect URLs
- Deploy Edge Function: `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`

---

## Next Steps (priority order)
1. **Deploy Edge Function** — run `npx supabase functions deploy auth-redirect ...` + add URL to Supabase Auth Redirect URLs
2. **GAP-08** — Add abnormal region overlay on thermal map (FR-603) — 3–4 hrs
3. **Angiosome temp computation** — Replace `MOCK_ANGIOSOMES` in clinical-data with real values computed from thermal matrix
4. **Patient-select Supabase search** — Replace client-side filter with `.ilike()` for scalability
5. Hardware integration (GAP-01–04) — deferred until device spec confirmed

---

## Open Questions
- What is the AI classification model — local inference or cloud API?
- Is BLE device hardware finalized? (deferred)
