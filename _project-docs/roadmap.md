# Roadmap & Suggestions — Vestigia
**Last updated:** 2026-03-21

> This file is the single source of truth for planned work, improvement ideas, and intentionally deferred items.
> It is read at `/start-session` and updated at `/end-session`.

---

## Planned — Next Sessions (ordered by priority)

| # | ID | Task | Est. | Notes |
|---|---|---|---|---|
| 1 | FR-506 | Image preprocessing — contrast normalization + foot region segmentation | 3–4 hrs | New module `lib/thermal/preprocessing.ts`. Normalizes raw 80×62 matrix; segments foot pixels from background using ambient temp baseline. Prerequisite for FR-507. |
| 2 | FR-507 | AI model prototype — bilateral temperature asymmetry detection | 4–5 hrs | New module `lib/classification/classifier.ts`. Maps angiosome regions to matrix coordinates, extracts per-angiosome mean temps for each foot, computes bilateral asymmetry, computes TCI, outputs `ClassificationResult`. Replaces `MOCK_RESULT` in assessment.tsx (GAP-04). |
| 3 | FR-508 | Preliminary risk scoring — Low / Medium / High rule-based thresholding | 2 hrs | Extends FR-507 output with a risk level based on max asymmetry delta and angiosome count. Stored in `classification_results.feature_vector` JSONB. See implementation plan below. |
| 4 | — | Deploy Edge Function | 15 min | `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`; add URL to Supabase Auth Redirect URLs in dashboard |
| 5 | GAP-08 | Add abnormal region overlay on thermal map (FR-603) | 3–4 hrs | Visual highlight of flagged angiosomes for clinicians; needs new component layer on top of `ThermalMap`. Depends on FR-507 output. |
| 6 | — | Angiosome temperature computation from thermal matrix | 4–5 hrs | Replaces `MOCK_ANGIOSOMES` in clinical-data.tsx (CODE-09). Merged into FR-507 scope — same angiosome extraction logic. |
| 7 | — | Patient-select Supabase search | 1 hr | Replace client-side `.filter()` with Supabase `.ilike()` on `patient_code`; current approach breaks at ~200+ patients |
| 8 | — | `useEffect` cleanup in assessment.tsx | 15 min | Call `clearSession()` on unmount to guard stale state if user leaves without pressing Save or Discard |

---

## Implementation Plan — AI Pipeline (FR-506 → FR-507 → FR-508)

### Overview
The AI pipeline runs entirely **client-side** on the captured bilateral thermal matrices. No cloud API is required for this prototype stage. The output is a `ClassificationResult` that replaces `MOCK_RESULT` in `assessment.tsx`.

```
Left matrix + Right matrix (80×62 each)
        ↓
[FR-506] lib/thermal/preprocessing.ts
  - normalizeMatrix()        → scales raw temp values to [0,1]
  - segmentFootRegion()      → masks background pixels using ambient baseline
        ↓
[FR-507] lib/classification/classifier.ts
  - extractAngiosomeTemps()  → maps 4 angiosome zones to matrix coords, computes mean temp per zone
  - computeAsymmetry()       → |left.mpa − right.mpa|, |left.lpa − right.lpa|, etc.
  - computeTCI()             → Thermal Circulation Index from angiosome temps
  - classify()               → POSITIVE if any asymmetry ≥ 2.2°C, else NEGATIVE
        ↓
[FR-508] risk scoring (inline or lib/classification/riskScoring.ts)
  - scoreRisk()              → LOW / MEDIUM / HIGH based on rules below
        ↓
  ClassificationResult       → saved to classification_results table
```

### FR-506 — Preprocessing Detail
| Function | Input | Output | Notes |
|---|---|---|---|
| `normalizeMatrix(matrix, min, max)` | raw number[][] | normalized number[][] [0–1] | Use captured `min_temp_c` / `max_temp_c` from `ThermalCapture` |
| `segmentFootRegion(matrix, ambientTemp)` | normalized matrix + ambient °C | boolean[][] mask | Pixels > (ambient + threshold) = foot; threshold ~2°C above ambient |

### FR-507 — Angiosome Zone Mapping
Four angiosomes mapped to approximate pixel regions on the 80×62 matrix:
| Zone | Abbreviation | Approx. Region (col%, row%) |
|---|---|---|
| Medial Plantar Artery | MPA | center-medial, mid-distal rows |
| Lateral Plantar Artery | LPA | center-lateral, mid-distal rows |
| Medial Calcaneal Artery | MCA | medial heel, proximal rows |
| Lateral Calcaneal Artery | LCA | lateral heel, proximal rows |

Classification rule: `POSITIVE` if `max(|leftZone − rightZone|) ≥ 2.2°C` (existing `ClinicalThresholds.asymmetry`).
Confidence score: `min(1.0, maxAsymmetry / 4.0)` — higher asymmetry = higher confidence in POSITIVE result.

### FR-508 — Risk Scoring Rules
| Risk Level | Condition |
|---|---|
| `LOW` | All zone asymmetries < 1.0°C |
| `MEDIUM` | Any zone asymmetry ≥ 1.0°C AND < 2.2°C (or 1–2 zones flagged) |
| `HIGH` | Any zone asymmetry ≥ 2.2°C (= DPN POSITIVE threshold; 3+ zones flagged) |

Stored in `classification_results.feature_vector` JSONB as `{ risk_level: "HIGH", flagged_zones: 3, ... }` — no schema change required.

### Schema Impact
- No new tables or columns needed for FR-506/FR-507
- FR-508 risk level stored in existing `feature_vector JSONB` field on `classification_results`
- `types/index.ts` — add `risk_level?: "LOW" | "MEDIUM" | "HIGH"` to `ClassificationResult.feature_vector` (or as a top-level optional field)

### Files to Create / Modify
| File | Action | Purpose |
|---|---|---|
| `lib/thermal/preprocessing.ts` | Create | FR-506 — normalize + segment |
| `lib/classification/classifier.ts` | Create | FR-507 — angiosome extraction, asymmetry, TCI, classify |
| `lib/classification/riskScoring.ts` | Create | FR-508 — LOW/MEDIUM/HIGH rules |
| `app/(clinic)/assessment.tsx` | Modify | Replace `MOCK_RESULT` with `classify()` call using real captured matrices |
| `app/(clinic)/clinical-data.tsx` | Modify | Replace `MOCK_ANGIOSOMES` with `extractAngiosomeTemps()` (CODE-09) |
| `types/index.ts` | Modify | Add `risk_level` to `ClassificationResult` |

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
