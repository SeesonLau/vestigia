# Progress — Vestigia
**Current version:** 0.3.0
**Last verified:** 2026-03-20

> Detailed checklists: `_project-docs/progress/`
> Bug report: `_project-docs/progress/qa-bugs.md`

---

## Version History
| Version | Date | Description |
|---|---|---|
| 0.3.0 | 2026-03-20 | Email confirmation deep link flow, account-activated screen, Edge Function redirect page |
| 0.2.0 | 2026-03-20 | Auth full audit + 10 bug fixes, clinic navigation wired, SafeAreaView fix, Ionicons, type fixes |
| 0.1.0 | 2026-03-20 | Initial setup — UI, auth, stores, mock data, MCP, memory bank |

---

## Done ✅
- All 24 UI screens built across 3 roles (clinic, patient, admin)
- Supabase auth fully wired (login, register, logout, session restore, password reset)
- Email confirmation flow — mobile deep link → account-activated screen → login
- Supabase Edge Function (`auth-redirect`) for email confirmation redirect page
- `app/(auth)/account-activated.tsx` — email confirmed success screen
- `app/(patient)/settings.tsx` — patient settings screen (was empty)
- 4 Zustand stores (authStore, sessionStore, deviceStore, thermalStore)
- Custom theme system (dark navy + teal, Space Grotesk fonts)
- 24+ components (ThermalMap, ClassificationCard, AngiosomeTable, VitalsForm, etc.)
- TypeScript strict types aligned with DB schema
- Mock data system (patients, sessions, vitals)
- MCP connected to Supabase (`yqgpykyogvoawlffkeoq`)
- Memory bank + CLAUDE.md + slash commands + QA tracking system
- Clinical thresholds defined (2.2°C, blood glucose 30–600, BP ranges)
- Clinic navigation wired: pairing → live-feed → clinical-data → assessment
- thermalStore wired to live-feed (frame capture) and clinical-data
- Mock accounts fully removed — all auth through Supabase
- SafeAreaView updated to `react-native-safe-area-context`
- All auth screens use Ionicons (no emoji icons)
- Input fields use placeholder-only (no label text)
- Auth error messages all user-friendly (mapAuthError covers all known codes)
- Client-side rate limiting on login
- All 10 auth bugs fixed (AUTH-04, AUTH-06, AUTH-08 to AUTH-15)
- babel.config.js fixed (no more duplicate decorator plugins)
- All 8 DB tables verified against thesis schema; RLS on all tables

## In Progress 🔄
- Edge Function deployment (needs `supabase functions deploy` + Supabase dashboard config)

## Not Started ❌
- WatermelonDB (offline-first local DB)
- Real Supabase reads for sessions, patients, vitals, results
- Wire clinic dashboard quick action buttons (4 empty stubs — UX-01)
- Clinical-data form submit to Supabase (GAP-05)
- Session lifecycle management (create, update status, complete)
- BLE device scanning and pairing (deferred — hardware not finalized)
- Wi-Fi WebSocket to thermal device (deferred — hardware not finalized)
- Real thermal frame reception (deferred — hardware not finalized)
- AI classification cloud upload + polling + result retrieval
- 30-minute session inactivity timeout (BUG-04)
- Clinic and Admin settings screens (functional)
- Offline queue and sync
- Abnormal region overlay on thermal map
- Push notifications

## Known Issues
- 1 Critical bug open (BUG-04 — 30-min inactivity timeout)
- 8 High gaps (BLE, Wi-Fi, AI, offline — mostly hardware-deferred)
- All data shown in app is mock — only auth reads from Supabase
- Edge Function not yet deployed
