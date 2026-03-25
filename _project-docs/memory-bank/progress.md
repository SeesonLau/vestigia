# Progress — Vestigia
**Current version:** 0.5.2
**Last verified:** 2026-03-24

> Detailed checklists: `_project-docs/progress/`
> Bug report: `_project-docs/progress/qa-bugs.md`

---

## Version History
| Version | Date | Description |
|---|---|---|
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
- Full codebase QA audit — 98 issues tracked, 68 fixed, 9 deferred, 21 open
- **assessment.tsx unmount cleanup** — `clearSession()` + `discardCapture()` called on unmount if not saved
- **patient-select Supabase search** — client-side filter replaced with `.ilike()` query (scales to any dataset size)
- **`risk_level` type** added to `ClassificationResult` in `types/index.ts`

## In Progress 🔄
- Edge Function deployment (needs `supabase functions deploy` + Supabase dashboard config)

## Not Started ❌

### AI Pipeline (planned — next priority)
> **Architecture note:** The AI model itself lives in a **separate repository**. This app only prepares data and calls the AI model's HTTP API — no ML inference runs inside this codebase.
- **FR-506** — Image preprocessing: contrast normalization + foot region segmentation + API payload builder (`lib/thermal/preprocessing.ts`). App-side, runs before sending data to external API.
- **FR-507** — AI model API integration: HTTP client (`lib/api/aiClient.ts`) that sends thermal payload to the external AI model API and maps the response to `ClassificationResult`. Replaces `MOCK_RESULT`. **Blocked until the AI model API endpoint is confirmed and accessible.**
- **FR-508** — Preliminary risk scoring: Low / Medium / High rule-based thresholding (`lib/classification/riskScoring.ts`), applied app-side using asymmetry values from the API response. Stored in `classification_results.feature_vector`.

### Other Planned
- **GAP-08** — No abnormal region overlay on thermal map (angiosome highlighting) — depends on FR-507
- Deploy Edge Function (`auth-redirect`)

### Deferred
- WatermelonDB (offline-first local DB) — deferred
- BLE device scanning and pairing (deferred — hardware not finalized)
- Wi-Fi WebSocket to thermal device (deferred — hardware not finalized)
- Real thermal frame reception (deferred — hardware not finalized)
- AI cloud upload + polling (deferred — FR-506–508 cover client-side prototype first)
- Offline queue and sync (deferred)
- Push notifications (deferred)

## Known Issues
- 1 Open nav: NAV-01 (no back button in assessment — intentional design, low priority)
- 1 Open data gap: GAP-08 (thermal map overlay — deferred)
- Multiple deferred hardware items (BLE, Wi-Fi, real thermal, AI)
- Edge Function not yet deployed
