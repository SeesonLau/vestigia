# Roadmap & Suggestions — Vestigia
**Last updated:** 2026-03-21

> This file is the single source of truth for planned work, improvement ideas, and intentionally deferred items.
> It is read at `/start-session` and updated at `/end-session`.

---

## Planned — Next Sessions (ordered by priority)

| # | ID | Task | Est. | Notes |
|---|---|---|---|---|
| 1 | — | Deploy Edge Function | 15 min | `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`; add URL to Supabase Auth Redirect URLs in dashboard |
| 2 | GAP-08 | Add abnormal region overlay on thermal map (FR-603) | 3–4 hrs | Visual highlight of flagged angiosomes for clinicians; needs new component layer on top of `ThermalMap` |
| 3 | — | Angiosome temperature computation from thermal matrix | 4–5 hrs | Replaces `MOCK_ANGIOSOMES` in clinical-data.tsx; required before real AI wiring (CODE-09) |
| 4 | — | Patient-select Supabase search | 1 hr | Replace client-side `.filter()` with Supabase `.ilike()` on `full_name` + `patient_code`; current approach breaks at ~200+ patients |
| 5 | — | `useEffect` cleanup in assessment.tsx | 15 min | Call `clearSession()` on unmount to guard stale state if user leaves without pressing Save or Discard |

---

## Suggestions — Under Consideration

| Idea | Rationale | Effort |
|---|---|---|
| Add `captured_at` explicitly in `thermal_captures.insert` | Don't rely on server-side default; makes insert intent clear | 5 min |
| Replace hardcoded `leftTci={0.038}` + `rightTci={0.046}` in assessment + session detail | TCI values should come from real computation, not magic numbers | Medium |
| Add Supabase real-time subscription to session detail screen | Live updates when classification result arrives from cloud | 2 hrs |
| Add patient registration form in clinic flow | Currently patients must be pre-loaded in DB; clinic staff should be able to register new patients | 3–4 hrs |
| Paginate admin users + clinics FlatList | Current query loads all rows; will degrade with large datasets | 2 hrs |
| Add search/filter to session history screen | Useful once sessions accumulate; filter by date range, result type | 1–2 hrs |

---

## Deferred — Intentionally Postponed

| Item | Reason | Resume When |
|---|---|---|
| BLE device scanning (GAP-01) | Hardware not finalized | Device spec confirmed |
| Wi-Fi WebSocket to scanner (GAP-02) | Hardware not finalized | Device spec confirmed |
| Real thermal frame streaming (GAP-03) | Hardware not finalized | Device spec confirmed |
| AI cloud classification + polling (GAP-04) | Cloud API not built | AI model / API ready |
| Angiosome computation from matrix (CODE-09) | Blocked on GAP-04 (needs AI model output for validation) | GAP-04 underway |
| WatermelonDB offline-first (GAP-06, DB-03, DB-04) | Not required for thesis demo; adds significant complexity | Post-defense or future sprint |
| Push notifications | Not in core thesis scope | Post-defense |

---

## Completed — Moved Here from Planned

| Version | Item | Date |
|---|---|---|
| v0.1.0 | Initial UI — all 24 screens across 3 roles | 2026-03-20 |
| v0.1.0 | Zustand stores, theme, mock data, MCP, memory bank | 2026-03-20 |
| v0.2.0 | Full auth audit (AUTH-01–15), Ionicons, SafeAreaView fix, type fixes | 2026-03-20 |
| v0.2.0 | Clinic navigation wired (BUG-01, BUG-02, BUG-03) | 2026-03-20 |
| v0.3.0 | Email confirmation deep link + account-activated screen + Edge Function | 2026-03-20 |
| v0.3.0 | Patient settings screen, patient session card navigation (UX-02, UX-05) | 2026-03-20 |
| v0.3.0 | Admin dashboard buttons wired (UX-03), assessment session cleanup (CODE-10) | 2026-03-20 |
| v0.4.0 | Supabase patient-select + clinical-data submit (GAP-05) | 2026-03-21 |
| v0.4.0 | Clinic settings fully wired (UX-04) | 2026-03-21 |
| v0.4.0 | Admin settings fully wired (UX-06) | 2026-03-21 |
| v0.4.0 | 30-minute inactivity timeout (BUG-04) | 2026-03-21 |
| v0.4.0 | console.log audit — clean (CODE-02) | 2026-03-21 |
| v0.4.0 | Full codebase QA audit — 79 issues tracked | 2026-03-21 |
| v0.5.0 | Startup perf overhaul — lazy Supabase init, JWT auth, no blocking DB call (PERF-05–08, NAV-02) | 2026-03-21 |
| v0.5.0 | Assessment Save to Cloud → classification_results insert (GAP-07) | 2026-03-21 |
| v0.5.0 | History screen wired to Supabase (GAP-09) | 2026-03-21 |
| v0.5.0 | Admin users screen wired to profiles table + Activate/Deactivate (GAP-10, UX-08) | 2026-03-21 |
| v0.5.0 | Admin clinics screen wired to clinics + devices tables (GAP-11) | 2026-03-21 |
| v0.5.0 | Both session detail screens wired to Supabase joins (UX-07) | 2026-03-21 |
| v0.5.0 | Clinic dashboard: real clinic name + today's stats from Supabase (CODE-11) | 2026-03-21 |
| v0.5.0 | Live-feed foot selector wired (BUG-05) | 2026-03-21 |
| v0.5.0 | Admin overview stats wired to Supabase | 2026-03-21 |
| v0.5.0 | Icon standardization — all emoji/unclear symbols → Ionicons across 20 files (UX-14) | 2026-03-21 |
| v0.5.0 | PGRST116 guard in patient dashboard | 2026-03-21 |
| v0.5.0 | Logout buttons on clinic home + patient dashboard | 2026-03-21 |
