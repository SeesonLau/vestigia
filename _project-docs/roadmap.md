# Roadmap & Suggestions — Vestigia
**Last updated:** 2026-04-03

> This file is the single source of truth for planned work, improvement ideas, and intentionally deferred items.
> It is read at `/start-session` and updated at `/end-session`.

---

## Planned — Next Sessions (ordered by priority)

| # | ID | Task | Est. | Notes |
|---|---|---|---|---|
| 1 | GAP-18 | Add Alert on Activate/Deactivate failure in admin users + clinics | 15 min | `handleToggleActive` in users.tsx + clinics.tsx — show Alert when Supabase update fails; currently silent |
| 2 | FR-506 | Image preprocessing — contrast normalization + foot region segmentation | 3–4 hrs | New module `lib/thermal/preprocessing.ts`. `normalizeMatrix()`, `segmentFootRegion()`, `buildApiPayload()`. Matrix is **160×120** (FLIR Lepton 3.5 — not 80×62). No hardware needed — can build now. |
| 3 | FR-508 | Preliminary risk scoring — Low / Medium / High rule-based thresholding | 2 hrs | New module `lib/classification/riskScoring.ts`. Rules: LOW < 1°C, MEDIUM 1–2.2°C, HIGH ≥ 2.2°C. `risk_level` field already added to type. |
| 4 | FR-507 | AI model API integration — send thermal data, receive classification result | 4–5 hrs | New module `lib/api/aiClient.ts`. **AI model lives in a separate repo** — blocked until AI API endpoint confirmed. |
| 5 | GAP-08 | Add abnormal region overlay on thermal map (FR-603) | 3–4 hrs | Depends on FR-507 output. Visual highlight of flagged angiosomes on ThermalMap. |
| 6 | CODE-09 | Replace `MOCK_ANGIOSOMES` in clinical-data.tsx | 2 hrs | Use preprocessing output (FR-506) to compute real angiosome temps. Merged into FR-506/507 scope. |

---

## Implementation Plan — AI Pipeline (FR-506 → FR-507 → FR-508)

### Architecture — IMPORTANT
> **The AI model lives in a separate repository and is NOT part of this codebase.**
> This app's responsibility is to prepare and send thermal data to the AI model's HTTP API, then receive and store the classification result. No ML inference runs inside this app.

```
This app (vestigia)                    External AI Model Repo
─────────────────────────              ─────────────────────────────────
Left + Right thermal matrices
         ↓
[FR-506] lib/thermal/preprocessing.ts
  - normalizeMatrix()                  (may also be done server-side
  - segmentFootRegion()                 by the AI API — confirm with
  - buildApiPayload()                   AI team before implementing)
         ↓
[FR-507] lib/api/aiClient.ts ─────────→  POST /analyze
  - sendForAnalysis(payload)           ←─  { classification, confidence,
  - pollForResult(jobId)                    asymmetries, risk_level, ... }
  - handleApiResponse()
         ↓
[FR-508] Rule-based risk scoring
  - Applied app-side using asymmetry
    values returned by the API,
    OR returned directly by the API
    (confirm with AI team)
         ↓
  ClassificationResult → saved to classification_results (Supabase)
```

### Responsibility Boundary
| Concern | This App (vestigia) | AI Model Repo |
|---|---|---|
| Capture thermal matrix (80×62) | ✅ | — |
| Store raw captures in Supabase | ✅ | — |
| Preprocess / normalize matrix | ✅ FR-506 | May also be done API-side |
| Bilateral asymmetry detection | ❌ — calls API | ✅ Lives here |
| DPN classification (POSITIVE/NEGATIVE) | ❌ — from API response | ✅ Lives here |
| Confidence score | ❌ — from API response | ✅ Lives here |
| Risk scoring (LOW/MEDIUM/HIGH) | ✅ FR-508 (rule-based, app-side) OR from API | TBD |
| Store `ClassificationResult` to Supabase | ✅ | — |
| Display result to clinician | ✅ | — |

### FR-506 — App-Side Preprocessing (before API call)
| Function | Input | Output | Notes |
|---|---|---|---|
| `normalizeMatrix(matrix, min, max)` | raw number[][] | normalized [0–1] | Use `ThermalCapture.min_temp_c` / `max_temp_c` |
| `segmentFootRegion(matrix, ambientTemp)` | normalized matrix + ambient °C | boolean[][] mask | Pixels > ambient + ~2°C = foot region |
| `buildApiPayload(left, right, vitals, session)` | captures + session data | JSON payload | Packages everything the AI API needs in one object |

### FR-507 — API Integration (this app's side only)
This app will:
1. Call the AI model's HTTP API with the preprocessed thermal payload
2. Handle async response — either synchronous response or job polling (confirm with AI team)
3. Map the API JSON response to the app's `ClassificationResult` type
4. Save the result to `classification_results` table in Supabase

**Files in this repo for FR-507:**
- `lib/api/aiClient.ts` — HTTP client for the external AI model API (base URL from `EXPO_PUBLIC_AI_API_URL` env var)
- `app/(clinic)/assessment.tsx` — replace mock progress animation with real API call + polling

**The AI model API contract (to be confirmed with AI team):**
- Endpoint: `POST /analyze` (or similar — TBD)
- Request body: bilateral thermal matrices + optional vitals metadata
- Response: classification (`POSITIVE`/`NEGATIVE`), confidence score, per-angiosome asymmetry values, flagged zones
- Auth: API key via `EXPO_PUBLIC_AI_API_KEY` env var

### FR-508 — Risk Scoring (app-side, rule-based)
Applied to the asymmetry values returned by the AI API:

| Risk Level | Condition |
|---|---|
| `LOW` | All zone asymmetries < 1.0°C |
| `MEDIUM` | Any zone asymmetry ≥ 1.0°C AND < 2.2°C |
| `HIGH` | Any zone asymmetry ≥ 2.2°C (= DPN POSITIVE threshold) |

Stored in `classification_results.feature_vector` JSONB as `{ risk_level: "HIGH", flagged_zones: 3, ... }` — no schema change required.
If the AI API already returns a `risk_level`, use that directly instead.

### Schema Impact
- No new tables or columns needed
- `EXPO_PUBLIC_AI_API_URL` and `EXPO_PUBLIC_AI_API_KEY` env vars to be added when API is ready
- `types/index.ts` — add `risk_level?: "LOW" | "MEDIUM" | "HIGH"` to `ClassificationResult`

### Files to Create / Modify (in this repo)
| File | Action | Purpose |
|---|---|---|
| `lib/thermal/preprocessing.ts` | Create | FR-506 — normalize matrix + build API payload |
| `lib/api/aiClient.ts` | Create | FR-507 — HTTP client for external AI model API |
| `lib/classification/riskScoring.ts` | Create | FR-508 — app-side LOW/MEDIUM/HIGH rules |
| `app/(clinic)/assessment.tsx` | Modify | Replace mock animation with real API call via `aiClient.ts` |
| `app/(clinic)/clinical-data.tsx` | Modify | Replace `MOCK_ANGIOSOMES` with preprocessing output (CODE-09) |
| `types/index.ts` | Modify | Add `risk_level` to `ClassificationResult` |
| `.env` | Modify | Add `EXPO_PUBLIC_AI_API_URL` and `EXPO_PUBLIC_AI_API_KEY` when API is ready |

---

## Suggestions — Under Consideration

| Idea | Rationale | Effort |
|---|---|---|
| Replace hardcoded `leftTci={0.038}` + `rightTci={0.046}` in assessment + session detail | TCI values should come from real computation, not magic numbers | Medium |
| Add Supabase real-time subscription to session detail screen | Live updates when classification result arrives from cloud | 2 hrs |
| Add patient registration form in clinic flow | Currently patients must be pre-loaded in DB; clinic staff should be able to register new patients | 3–4 hrs |
| Paginate admin users + clinics FlatList | Current query loads all rows; will degrade with large datasets | 2 hrs |
| Add search/filter to session history screen | Useful once sessions accumulate; filter by date range, result type | 1–2 hrs |
| Add `Clinic`, `Device`, `SystemConfig` types to `types/index.ts` | Currently only local interfaces in admin screens | 30 min |

---

## Deferred — Intentionally Postponed

| Item | Reason | Resume When |
|---|---|---|
| BLE device scanning (GAP-01) | Hardware not finalized | Device spec confirmed |
| Wi-Fi WebSocket to scanner (GAP-02) | Hardware not finalized | Device spec confirmed |
| Real thermal frame streaming (GAP-03) | Hardware not finalized | Device spec confirmed |
| AI model API integration (GAP-04 / FR-507) | External AI model API not yet deployed — lives in a **separate repo**. This app will call it via HTTP. | AI model API endpoint confirmed + accessible |
| Angiosome computation from matrix (CODE-09) | Blocked on FR-506/507 — preprocessing defines the payload; API response validates the output | FR-506 done |
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
| v0.5.2 | assessment.tsx unmount cleanup — clearSession + discardCapture on nav-away | 2026-03-24 |
| v0.5.2 | patient-select search replaced with Supabase .ilike() (scalable) | 2026-03-24 |
| v0.5.2 | risk_level added to ClassificationResult type | 2026-03-24 |
| v0.5.3 | UX-17 — Debug subtitle strings removed from 8 screens | 2026-03-30 |
| v0.5.3 | GAP-15 — History screen positive/negative counts fixed (PostgREST join normalized) | 2026-03-30 |
| v0.5.3 | GAP-16/17 — Admin users + clinics fetch error handling added | 2026-03-30 |
| v0.5.3 | UX-15/16 — Clinic home loading indicator + error state added | 2026-03-30 |
| v0.5.3 | CODE-16 — dbg() guarded with __DEV__ | 2026-03-30 |
| v0.5.3 | A11Y-05 — tabBarAccessibilityLabel added to all 5 clinic tabs | 2026-03-30 |
| v0.5.3 | CODE-14 — Version string updated to v0.5.2 in login.tsx | 2026-03-30 |
| v0.5.3 | NAV-03 — Patient settings now reachable via header icon | 2026-03-30 |
| v0.5.3 | PERF-09/10/11 — FlatList renderItem extracted to useCallback in 3 screens | 2026-03-30 |
| v0.5.3 | Full QA audit — 79 fixed, 9 open, 9 deferred; 0 regressions | 2026-03-30 |
