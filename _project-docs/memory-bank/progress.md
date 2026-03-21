# Progress — Vestigia
**Current version:** 0.4.0
**Last verified:** 2026-03-21

> Detailed checklists: `_project-docs/progress/`
> Bug report: `_project-docs/progress/qa-bugs.md`

---

## Version History
| Version | Date | Description |
|---|---|---|
| 0.4.0 | 2026-03-21 | Inactivity timeout, clinic + admin settings wired, full QA audit (55 issues tracked) |
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
- GAP-05: clinical-data form writes to `screening_sessions`, `patient_vitals`, `thermal_captures`
- Patient select screen (`patient-select.tsx`) fetches real patients from Supabase by clinic_id
- sessionStore extended: `selectedPatient`, `clearSession`
- thermalStore extended: `discardCapture`
- Mock accounts fully removed — all auth through Supabase
- All auth screens use Ionicons (no emoji icons)
- Auth error messages all user-friendly (mapAuthError covers all known codes)
- Client-side rate limiting on login (5 attempts → 30s lockout)
- All 15 auth bugs fixed (AUTH-01 through AUTH-15)
- All 8 DB tables verified against thesis schema; RLS on all tables
- All role dashboards + admin tabs navigable
- Patient session card navigates to session detail
- Admin dashboard action buttons wired (+ Invite User, + Add Clinic, Configure Model, Export alerts)
- Assessment exit calls `clearSession()` + `discardCapture()` (CODE-10)
- **Clinic settings screen** — all handlers wired (Sign Out confirm, Change Password, Device, Cache, Delete) (UX-04)
- **Admin settings screen** — all handlers wired (Sign Out confirm, Change Password, Coming Soon stubs) (UX-06)
- **Patient settings screen** — Sign Out, Change Password, Notifications (UX-05)
- **30-minute inactivity timeout** — `hooks/useInactivityTimeout.ts` + wired in root `_layout.tsx` (BUG-04)
- console.log audited — no sensitive data (CODE-02)
- Full codebase QA audit — 55 issues tracked, 37 fixed, 18 open

## In Progress 🔄
- Edge Function deployment (needs `supabase functions deploy` + Supabase dashboard config)

## Not Started ❌
- **BUG-05** — Live-feed foot selector buttons non-functional (no `onPress`)
- **UX-07** — Session detail screens read mock data (real sessions show "not found")
- **GAP-09** — History screen reads mock sessions, not Supabase
- **CODE-11** — Clinic dashboard shows hardcoded clinic name
- **GAP-07** — Assessment "Save to Cloud" doesn't write to `classification_results`
- **UX-08** — Admin Deactivate/Activate modal buttons are stubs
- **GAP-10/11** — Admin users + clinics screens serve mock data
- WatermelonDB (offline-first local DB)
- BLE device scanning and pairing (deferred — hardware not finalized)
- Wi-Fi WebSocket to thermal device (deferred — hardware not finalized)
- Real thermal frame reception (deferred — hardware not finalized)
- AI classification cloud upload + polling + result retrieval
- Offline queue and sync
- Abnormal region overlay on thermal map
- Push notifications

## Known Issues
- 1 Critical open: BUG-05 (foot selector broken — always saves as "bilateral")
- 10 High gaps (mostly hardware-deferred, but GAP-07/09/10/11 are wirable)
- 2 Medium UX gaps: UX-07, UX-08
- Most screens still display mock data except: auth, patient-select, clinical-data submit
- Edge Function not yet deployed
