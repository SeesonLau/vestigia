# Roadmap & Suggestions — Vestigia
**Last updated:** 2026-03-21

> This file is the single source of truth for planned work, improvement ideas, and intentionally deferred items.
> It is read at `/start-session` and updated at `/end-session`.

---

## Planned — Next Sessions (ordered by priority)

| # | ID | Task | Est. | Notes |
|---|---|---|---|---|
| 1 | BUG-05 | Fix live-feed foot selector `onPress` — always saves as "bilateral" | 30 min | One-liner per button; active style must mirror `selectedFoot` state |
| 2 | UX-07 | Wire session detail screens to real Supabase data | 2–3 hrs | Both `(clinic)/session/[id].tsx` and `(patient)/session/[id].tsx`; join `classification_results`, `patient_vitals`, `thermal_captures` |
| 3 | GAP-09 | Wire history.tsx to real `screening_sessions` from Supabase | 1–2 hrs | Filter by `clinic_id`; replace `MOCK_CLINIC_SESSIONS` |
| 4 | CODE-11 | Fetch real clinic name on clinic dashboard | 30 min | Read from `clinics` table using `user.clinic_id` on mount |
| 5 | GAP-07 | Wire assessment "Save to Cloud" to `classification_results` insert | 1 hr | Currently only calls `setSaved(true)`; result is never persisted |
| 6 | UX-08 | Wire admin Activate/Deactivate modal buttons to Supabase | 1–2 hrs | `profiles` update for users; `clinics` update for clinics |
| 7 | GAP-10 | Wire admin users screen to real `profiles` table | 2–3 hrs | Replace `MOCK_ALL_USERS`; add role/status filter via `.eq()` |
| 8 | GAP-11 | Wire admin clinics screen to real `clinics` + `devices` tables | 2–3 hrs | Replace `MOCK_CLINICS` + `MOCK_DEVICES` |

---

## Suggestions — Under Consideration

| Idea | Rationale | Effort |
|---|---|---|
| Add `captured_at` explicitly in `thermal_captures.insert` | Don't rely on server-side default; makes insert intent clear | 5 min |
| Replace hardcoded `leftTci={0.038}` + `rightTci={0.046}` in assessment + session detail | TCI values should come from real computation, not magic numbers | Medium |
| Add patient greeting from `authStore.user` in `(patient)/index.tsx` | Currently hardcoded as "Hello, Juan" + "DPN-P-0042" | 30 min |
| Add Supabase `.ilike()` search to patient-select.tsx | Current search is client-side only; will break at ~200+ patients | 1 hr |
| Add `useEffect` cleanup to assessment.tsx calling `clearSession()` on unmount | Guards stale state if user leaves without pressing a button | 15 min |
| Replace `🏥` emoji in `(admin)/clinics.tsx` with Ionicons | Inconsistent with rest of app after UX-04/06 Ionicons migration | 15 min |
| Add abnormal region overlay on thermal map (FR-603) | Visual highlight of flagged angiosomes for clinicians | 3–4 hrs |
| Implement angiosome temperature computation from thermal matrix | Removes `MOCK_ANGIOSOMES` from clinical-data; needed before AI wiring | 4–5 hrs |

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
| v0.4.0 | Full codebase QA audit — 55 issues tracked | 2026-03-21 |
