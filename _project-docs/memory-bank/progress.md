# Progress — Lumenai (formerly Vestigia)
**Current version:** 0.9.0
**Last verified:** 2026-04-06

> Detailed checklists: `_project-docs/progress/`
> Bug report: `_project-docs/progress/qa-bugs.md`

---

## Version History
| Version | Date | Description |
|---|---|---|
| 0.9.0 | 2026-04-06 | DPN Classification API integration (FR-507) — bilateral capture flow, pure-JS PNG encoder, real API client + store, wired assessment + result screen |
| 0.8.0 | 2026-04-06 | Real BLE + Wi-Fi dual camera support (FLIR + ESP32 MIO802M5S); session detail screens removed |
| 0.7.0 | 2026-04-06 | Full Arctic Mint theme migration (Phase 7+8), legacy Colors removed, app renamed to Lumenai, BUG-06 fixed in 4 files |
| 0.6.0 | 2026-04-04 | UVC camera, offline-first feature, FR-506 preprocessing, FR-508 risk scoring, GAP-18 admin alerts |
| 0.5.3 | 2026-03-30 | QA sweep: 12 bugs fixed (UX-17, GAP-15/16/17, UX-15/16, CODE-16/14, A11Y-05, NAV-03, PERF-09/10/11). 9 open issues remain |
| 0.5.2 | 2026-03-24 | Quick fixes: assessment unmount cleanup, patient-select Supabase search, risk_level type added. Full QA audit — 0 regressions |
| 0.5.1 | 2026-03-21 | Tab bar icon-only, patient-select hidden from tab bar |
| 0.5.0 | 2026-03-21 | All Supabase screens wired (8 features), startup perf overhaul, icon standardization (20 files) |
| 0.4.0 | 2026-03-21 | Inactivity timeout, clinic + admin settings wired, full QA audit (79 issues tracked) |
| 0.3.0 | 2026-03-20 | Email confirmation deep link flow, account-activated screen, Edge Function redirect page |
| 0.2.0 | 2026-03-20 | Auth full audit + 10 bug fixes, clinic navigation wired, SafeAreaView fix, Ionicons, type fixes |
| 0.1.0 | 2026-03-20 | Initial setup — UI, auth, stores, mock data, MCP, memory bank |

---

## Done ✅
- All 24 UI screens built across 3 roles (clinic, patient, admin)
- Supabase auth fully wired (login, register, logout, session restore, password reset)
- Email confirmation flow — mobile deep link → account-activated screen → login
- Supabase Edge Function (`auth-redirect`) for email confirmation redirect page
- 4 Zustand stores (authStore, sessionStore, deviceStore, thermalStore)
- Custom theme system (dark navy + teal, Space Grotesk fonts)
- 24+ components (ThermalMap, ClassificationCard, AngiosomeTable, VitalsForm, etc.)
- TypeScript strict types aligned with DB schema
- Mock data system (patients, sessions, vitals)
- MCP connected to Supabase (`yqgpykyogvoawlffkeoq`)
- Memory bank + CLAUDE.md + slash commands + QA tracking system
- Clinical thresholds defined (2.2°C, blood glucose 30–600, BP ranges)
- Clinic screening flow fully wired: Dashboard → Pair → Patient Select → Live Feed → Clinical Data → Assessment
- **GAP-05** clinical-data form writes to `screening_sessions`, `patient_vitals`, `thermal_captures`
- **GAP-07** Assessment "Save to Cloud" inserts to `classification_results`, updates session status
- **GAP-09** History screen loads real sessions from Supabase by `clinic_id`
- **GAP-10** Admin users screen loads real `profiles` table; Activate/Deactivate wired
- **GAP-11** Admin clinics screen loads real `clinics` + `devices` tables; Activate/Deactivate wired
- **UX-07** Both session detail screens (`clinic` + `patient`) load real Supabase data with joins
- **UX-08** Admin Activate/Deactivate modal buttons call Supabase `.update()`
- **CODE-11** Clinic dashboard fetches real clinic name and today's session stats from Supabase
- **BUG-05** Live-feed foot selector buttons wired with `onPress`; active style mirrors state
- Patient select screen fetches real Supabase patients by clinic_id
- sessionStore + thermalStore cleanup on session exit (CODE-10)
- Mock accounts fully removed — all auth through Supabase
- **Icon standardization (UX-14)** — All emoji and unclear symbols replaced with Ionicons across 20 files
- **Startup perf overhaul** — Lazy Supabase init via Proxy, JWT-based auth (no DB call on cold start), `"output": "single"`, `<Redirect>` in index.tsx; cold start <1 second
- `lib/debug.ts` — timestamped debug logger for startup tracing
- All role dashboards + admin tabs navigable and data-wired
- 30-minute inactivity timeout on all roles (BUG-04)
- All settings screens handlers wired (clinic, patient, admin)
- console.log audited — no sensitive data (CODE-02)
- Full codebase QA audit — 98 issues tracked, 79 fixed, 9 deferred, 9 open (as of 2026-03-30)
- **assessment.tsx unmount cleanup** — `clearSession()` + `discardCapture()` called on unmount if not saved
- **patient-select Supabase search** — client-side filter replaced with `.ilike()` query (scales to any dataset size)
- **`risk_level` type** added to `ClassificationResult` in `types/index.ts`
- **Debug subtitles removed** — `"UI-02"` through `"UI-08"` strings cleared from 8 production screens (UX-17)
- **History counts fixed** — PostgREST join normalization in `history.tsx`; positive/negative counts now accurate (GAP-15)
- **Admin error states** — error destructuring + visible UI added to users.tsx + clinics.tsx fetch (GAP-16/17)
- **Clinic home** — loading indicator + error state added for stats fetch (UX-15/16)
- **`dbg()` prod guard** — `__DEV__` check added to prevent debug logs in production (CODE-16)
- **Tab accessibility** — `tabBarAccessibilityLabel` added to all 5 clinic tabs (A11Y-05)
- **Patient settings reachable** — settings icon added to patient dashboard header (NAV-03)
- **FlatList perf** — `renderItem` extracted to `useCallback` in history, admin users, admin clinics (PERF-09/10/11)
- **Version string** — `login.tsx` updated to `v0.5.2` (CODE-14)
- **Arctic Mint theme** — full light/dark mode system with `ThemeProvider` + `useTheme()` hook; all 24 screens and all shared components migrated; legacy `Colors` export removed from `constants/theme.ts`
- **Dual camera support** — `lib/thermal/bleCamera.ts` (real BLE via react-native-ble-plx) + `lib/thermal/wifiCamera.ts` (WebSocket stream for ESP32 MIO802M5S); `pairing.tsx` full rewrite with real BLE scan + WiFi IP config; `live-feed.tsx` branches on `cameraSource`; `CameraSource` type added; BLE Android permissions added
- **Session detail screens removed** — `app/(clinic)/session/[id].tsx` and `app/(patient)/session/[id].tsx` deleted; blank 5th tab removed from clinic nav
- **App renamed Lumenai** — `app.json` display name updated; `constants/strings.ts` app name set to "Lumenai"
- **BUG-06 fixed** — `THUMB_H` ratio corrected to `(120/160)` in 4 files: `app/(patient)/index.tsx`, `app/(clinic)/assessment.tsx`, `app/(patient)/session/[id].tsx`, `app/(clinic)/session/[id].tsx`
- **UVC camera** — Android native module (saki4510t/UVCCamera), JS bridge, live-feed wired to real frames
- **FR-506** — `lib/thermal/preprocessing.ts`: `parseY16Frame`, `normalizeMatrix`, `segmentFootRegion`, `buildApiPayload`
- **Offline-first** — mode-select, offline live-feed + save, SQLite storage, History Local tab, clinic sync, patient accept/reject
- **FR-508** — `lib/classification/riskScoring.ts`: LOW/MEDIUM/HIGH at 1.5°C / 2.2°C thresholds
- **GAP-18** — Alert on Activate/Deactivate Supabase failure (admin users + clinics)
- WatermelonDB removed from project

## In Progress 🔄
- Edge Function deployment (needs `supabase functions deploy` + Supabase dashboard config)

## Not Started ❌

### AI Pipeline
> **Architecture note:** The AI model lives in a **separate repository**. This app only prepares data and calls the AI model's HTTP API.
- **FR-507** — AI model API integration: `lib/api/aiClient.ts` — **Blocked until AI team confirms endpoint URL, request format, and response schema.**
- **GAP-08** — Angiosome overlay on thermal map — depends on FR-507 response shape

### Other Planned
- Deploy Edge Function (`auth-redirect`)
- `npm install` to clear WatermelonDB from node_modules

### Deferred
- Push notifications

## Known Issues
- NAV-01: No back button on assessment (intentional design, low priority)
- GAP-08: Thermal map overlay (deferred — needs FR-507)
- Edge Function not yet deployed
