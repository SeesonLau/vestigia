# Plantar Angiosome Division — Reference
**Last updated:** 2026-04-08
**Source:** Thesis paper — Proportional Foot Division into Plantar Angiosomes

---

## Overview

The plantar surface of each foot is divided into four angiosome regions supplied by distinct arterial branches. Lumen AI uses these regions to compute per-zone mean temperatures from the thermal matrix, enabling localized asymmetry detection between left and right feet.

The four regions:

| Region | Full Name | Arterial Supply |
|--------|-----------|-----------------|
| MPA | Medial Plantar Artery | Forefoot, internal (medial) side |
| LPA | Lateral Plantar Artery | Forefoot, lateral side |
| MCA | Medial Calcaneal Artery | Heel, internal (medial) side |
| LCA | Lateral Calcaneal Artery | Heel, lateral side |

---

## Proportional Division

Based on the thesis paper, the foot is divided using fixed proportions applied to the thermal image dimensions:

### Height (rows) — Forefoot vs. Heel
| Zone | Row Range | Proportion |
|------|-----------|------------|
| Upper (forefoot) — MPA + LPA | top 60% of rows | 0.60 × height |
| Lower (heel) — MCA + LCA | bottom 40% of rows | 0.40 × height |

### Width (columns) — Internal vs. Lateral
| Zone | Column Range | Proportion |
|------|-------------|------------|
| Internal (medial) — MPA + MCA | 35% of cols | 0.35 × width |
| Lateral — LPA + LCA | 65% of cols | 0.65 × width |

> **Note:** Medial and lateral are **mirrored** between left and right feet when viewed in plantar orientation (toes at top of image).

---

## Visual Layout

### Left Foot (plantar view, toes at top)

```
Col 0                      Col W
  ← Lateral (65%) ──────── │ ── Internal (35%) →
  ┌──────────────────────────┬────────────────┐  ← Row 0 (toes)
  │                          │                │
  │          LPA             │      MPA       │  Upper 60%
  │                          │                │
  │                          │                │
  ├──────────────────────────┼────────────────┤  ← Row splitR (60%)
  │          LCA             │      MCA       │  Lower 40%
  │                          │                │
  └──────────────────────────┴────────────────┘  ← Row H (heel)
```

### Right Foot (plantar view, toes at top)

```
Col 0                      Col W
  ← Internal (35%) ─────── │ ─── Lateral (65%) →
  ┌────────────────┬──────────────────────────┐  ← Row 0 (toes)
  │                │                          │
  │      MPA       │          LPA             │  Upper 60%
  │                │                          │
  │                │                          │
  ├────────────────┼──────────────────────────┤  ← Row splitR (60%)
  │      MCA       │          LCA             │  Lower 40%
  │                │                          │
  └────────────────┴──────────────────────────┘  ← Row H (heel)
```

---

## Implementation

**File:** `app/(clinic)/clinical-data.tsx` → `computeAngiosomes(matrix, side)`

```
splitR = floor(rows × 0.60)   ← forefoot / heel boundary
splitC = floor(cols × 0.35)   ← internal / lateral boundary
```

### Left foot column mapping
| Region | Rows | Cols |
|--------|------|------|
| MPA | 0 → splitR | splitC → cols |
| LPA | 0 → splitR | 0 → splitC |
| MCA | splitR → rows | splitC → cols |
| LCA | splitR → rows | 0 → splitC |

### Right foot column mapping
| Region | Rows | Cols |
|--------|------|------|
| MPA | 0 → splitR | 0 → splitC |
| LPA | 0 → splitR | splitC → cols |
| MCA | splitR → rows | 0 → splitC |
| LCA | splitR → rows | splitC → cols |

---

## Assumptions & Limitations

- The thermal matrix must be captured in **plantar orientation** (toes at top, heel at bottom)
- The foot must be roughly centered and filling the frame — capture protocol must enforce this
- This is a geometric approximation; accuracy improves with consistent capture positioning
- Per-pixel anatomical precision requires a foot segmentation model (future enhancement — see Option B doc)

---

## Asymmetry Threshold

Per thesis and clinical literature:
- **≥ 2.2°C** difference in any region between left and right → clinically significant, flagged
- **≥ 1.5°C** → borderline, noted
- **< 1.5°C** → within normal range

These thresholds are applied in `lib/classification/riskScoring.ts`.
