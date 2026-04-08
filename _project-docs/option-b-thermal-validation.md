# Option B — Server-Side Thermal Image Validation
**Status:** Proposed — pending AI team implementation
**Author:** Lumen AI Team
**Last updated:** 2026-04-08

---

## Problem

Users can submit any image (photos, screenshots, random files) instead of a real plantar thermal image. The DPN classification model will still run and return a result — but the output is meaningless and potentially misleading in a clinical context.

There is no current validation that checks:
- Is the image thermal? (not a regular RGB photo)
- Does the image show a foot? (not a random object)

---

## Proposed Solution — Option B: Server-Side Pre-Validation in the DPN API

Before running the DPN classification model, the API adds a **pre-validation step** that rejects invalid inputs early and returns a structured error. The app already handles API errors gracefully (error state in `assessment.tsx`) — it just needs to surface the rejection message.

---

## Flow

```
App (Lumen AI)                          DPN API Server
──────────────                          ─────────────────────────────────────

User imports image + CSV
        │
        ▼
Both feet captured
(leftImageB64, rightImageB64,
 leftMatrix, rightMatrix)
        │
        ▼
"Submit for AI Analysis"
        │
        ▼
clinical-data.tsx → assessment.tsx
        │
        ▼
dpnStore.startScan()
POST /analyze
{ left_image_b64, right_image_b64,     ──────────────────────────────────→
  left_temperatures, right_temperatures }
                                                │
                                                ▼
                                        ┌─────────────────────────┐
                                        │  Step 1: Decode images  │
                                        │  (base64 → raw pixels)  │
                                        └──────────┬──────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────────┐
                                        │  Step 2: Thermal check  │
                                        │  Is colormap thermal?   │
                                        │  (iron/rainbow palette) │
                                        └──────────┬──────────────┘
                                                   │ fail → HTTP 422
                                                   │ pass ↓
                                                   ▼
                                        ┌─────────────────────────┐
                                        │  Step 3: Foot detection │
                                        │  Does image contain a   │
                                        │  plantar foot region?   │
                                        └──────────┬──────────────┘
                                                   │ fail → HTTP 422
                                                   │ pass ↓
                                                   ▼
                                        ┌─────────────────────────┐
                                        │  Step 4: DPN classify   │
                                        │  (existing model)       │
                                        └──────────┬──────────────┘
                                                   │
←──────────────────────────────────────────────────┘
        │
        ▼
success → dpn-result.tsx
error   → assessment.tsx error state
          (shows rejection reason to user)
```

---

## API Contract Changes

### Request (unchanged)
```json
POST /analyze
{
  "left_image_b64":      "<base64 PNG>",
  "right_image_b64":     "<base64 PNG>",
  "left_temperatures":   [[...], ...],
  "right_temperatures":  [[...], ...]
}
```

### Response — Validation Failure (new)
```json
HTTP 422 Unprocessable Entity
{
  "error": "invalid_input",
  "reason": "not_thermal",
  "message": "The submitted image does not appear to be a thermal image. Please use thermal camera output only.",
  "foot": "left"
}
```

```json
HTTP 422 Unprocessable Entity
{
  "error": "invalid_input",
  "reason": "no_foot_detected",
  "message": "No plantar foot region was detected in the submitted image.",
  "foot": "right"
}
```

### Response — Success (unchanged)
```json
HTTP 200
{
  "classification": "POSITIVE" | "NEGATIVE",
  "confidence_score": 0.91,
  ...
}
```

---

## Validation Logic (AI team implements)

### Step 2 — Thermal Colormap Check
Check if the image's color distribution matches a thermal colormap palette (iron, rainbow, or grayscale thermal):

**Iron colormap heuristic:**
- High-temp pixels: R channel dominant (reds, whites)
- Mid-temp pixels: yellows, oranges present
- Low-temp pixels: blues, purples present
- Regular RGB photos: dominant greens (foliage), skin tones (flesh), grays — different distribution

**Practical implementation:**
- Compute histogram of hue values in HSV space
- Thermal iron images cluster in reds (0°–30°) + blues (200°–270°) with little green (80°–160°)
- If green hue range > 30% of pixels → reject as non-thermal
- Alternatively, run a lightweight binary classifier (thermal vs. non-thermal) trained on your dataset

### Step 3 — Foot Detection
Detect if the image contains a plantar foot region:

**Options (AI team chooses):**
- **Lightweight option:** Use a pre-trained MobileNet or YOLO-nano fine-tuned on thermal foot images; runs in <100ms
- **Simple heuristic:** Check image aspect ratio (plantar foot images are roughly portrait 3:4 or square), check that the warmest region forms an elongated blob (foot shape), check that at least 40% of pixels are within foot-temperature range (28°C–38°C based on `left_temperatures`/`right_temperatures` arrays)

---

## App-Side Changes Required

The app already handles API errors in `dpnStore.ts`. One mapping needs to be added:

### File: `store/dpnStore.ts`
Add `"invalid_input"` to the error mapping:

```typescript
// In the error handler inside startScan():
if (res.status === 422) {
  const body = await res.json();
  const foot = body.foot === "right" ? "Right" : "Left";
  set({
    status: "error",
    error: body.message ?? `${foot} foot image rejected. Please use a real thermal image.`,
  });
  return;
}
```

### File: `lib/dpnApi.ts`
Add 422 to the HTTP error map:

```typescript
if (!res.ok) {
  if (res.status === 422) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Image validation failed. Please submit a real thermal foot image.");
  }
  // ... existing 400/500/503/408 handlers
}
```

No UI changes needed — the existing error state in `assessment.tsx` already displays the error message to the user with a Retry / Cancel Session option.

---

## User Experience

**Current (no validation):**
1. User imports random photo
2. DPN API runs and returns a result (meaningless)
3. Result is saved to Supabase as if it were a real scan

**After Option B:**
1. User imports random photo
2. DPN API rejects at Step 2 or Step 3
3. `assessment.tsx` shows: "Image validation failed. The submitted image does not appear to be a thermal image."
4. User can tap **Retry** → goes back to capture screen
5. No result is saved to Supabase

---

## What the AI Team Needs to Deliver

| Item | Description |
|------|-------------|
| Thermal colormap check | Reject non-thermal images before classification |
| Foot region detection | Reject images with no visible plantar foot |
| HTTP 422 response shape | `{ error, reason, message, foot }` as specified above |
| No breaking changes | Existing valid requests must continue to work as-is |

---

## What Lumen AI App Needs to Deliver (after API is updated)

| File | Change | Effort |
|------|--------|--------|
| `lib/dpnApi.ts` | Handle HTTP 422 | ~5 lines |
| `store/dpnStore.ts` | Map 422 to user-facing error | ~8 lines |

Both changes are additive — no existing behavior changes.

---

## Notes

- The `left_temperatures` / `right_temperatures` arrays sent in the request can be used by the API to cross-check the image (e.g. if temperature range is 28–38°C but the image has no warm pixels in that range, it's likely a mismatch)
- This feature does **not** require any changes to the DPN classification model itself — it is purely a pre-processing gate
- Phase 1 could implement only the thermal colormap check (fast, low effort); foot detection can be Phase 2
