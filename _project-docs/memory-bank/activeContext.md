# Active Context — Vestigia
**Last updated:** 2026-03-24

---

## What Was Done This Session (2026-03-24 — v0.5.2)

### Quick Code Fixes
- **assessment.tsx** — Added unmount cleanup `useEffect`: calls `clearSession()` + `discardCapture()` if user navigates away before saving result. Guards stale Zustand state.
- **patient-select.tsx** — Replaced two-`useEffect` client-side `.filter()` pattern with a single Supabase `.ilike()` query on `patient_code`, triggered by `search` state change. Removed dead `filtered` state. Scales to any dataset size.
- **types/index.ts** — Added `risk_level?: "LOW" | "MEDIUM" | "HIGH"` to `ClassificationResult`. Ready for FR-508 without any schema change needed.

### QA Audit (Full Codebase)
- Ran full /qa across all 9 areas (code quality, UI, flows, Supabase, network errors, performance, accessibility, navigation, regression)
- **0 regressions** — all 68 previously fixed items confirmed still fixed
- **21 open issues** confirmed — same as end of v0.5.1 (no new bugs introduced)
- All 4 progress docs verified and date-bumped to 2026-03-24

### Session Protocol
- Answered questions about /start-session, /end-session, git workflow, and branch creation
- Clarified: /end-session does NOT commit or push — git is manual

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
- ✅ Assessment unmount cleanup (clearSession + discardCapture on nav-away)
- ✅ Patient-select uses Supabase .ilike() search (scalable)
- ❌ No abnormal region overlay on thermal map (GAP-08 — deferred)
- ❌ BLE/Wi-Fi device comms deferred (hardware not finalized)
- ❌ AI classification is mock (GAP-04 — hardware/API dependency)

### Open Issues (21 total)
**High:** GAP-15 (history positive/negative count = 0 due to PostgREST join not normalized)
**Medium:** UX-17 (7 screens show debug subtitle strings), UX-16 (clinic home errors swallowed), GAP-16/17 (admin fetch no error), GAP-18 (toggle active no feedback), CODE-16 (debug logs in prod), A11Y-04/05, NAV-03
**Low:** CODE-14/15/17/18, UX-11/15, PERF-09/10/11, NAV-01

### Pending Supabase Dashboard Steps
- Add Edge Function URL to Redirect URLs
- Deploy Edge Function: `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`

### Git
- Branch not yet created — user to create before committing today's changes
- No commits made this session

---

## Next Steps (priority order)
1. **UX-17** — Remove debug subtitle strings from 7 screens (delete `subtitle="UI-xx"` props)
2. **GAP-15** — Fix PostgREST join normalization in `history.tsx` (copy pattern from `session/[id].tsx`)
3. **GAP-16 / GAP-17** — Add error destructuring + user feedback in admin users/clinics fetch
4. **GAP-18** — Add user notification on Activate/Deactivate failure
5. **UX-15 / UX-16** — Add loading indicator + error state to clinic home
6. **FR-506** — Build `lib/thermal/preprocessing.ts` (independent of AI API — can build now)
7. **FR-507** — AI model API client (blocked until AI API endpoint confirmed)
8. **FR-508** — Risk scoring stub (can be built once FR-507 contract known)
9. **Deploy Edge Function** — 15 min manual step

---

## Open Questions
- **AI model API contract** — What is the endpoint URL, request format, response schema, and auth method for the external AI model API? Must be confirmed before FR-507.
- **Preprocessing scope** — Does the external AI API expect raw matrices or preprocessed/normalized data?
- **Risk scoring ownership** — Does the AI API return `risk_level` directly, or does the app compute it?
- Is BLE device hardware finalized? (deferred)
