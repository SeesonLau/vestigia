# Thermal Image Flow — Lumen AI
**Last updated:** 2026-04-08

Two capture paths exist. Both converge at the same bilateral store → DPN API → result flow.

---

## Flow 1 — Live Thermal Camera (FLIR Lepton 3.5 via PureThermal Mini Pro)

```
Physical Hardware
─────────────────
FLIR Lepton 3.5
  │ JST-SH connector
  ▼
PureThermal Mini Pro (USB-C)
  │ USB OTG cable
  ▼
Android Phone

Android / Native Layer
──────────────────────
USBMonitor (UVCModule.kt)
  │ Detects USB device attach
  │ Requests USB host permission from user
  ▼
UVCCamera.open() @ 160×120 YUYV format
  │
IFrameCallback.onFrame(rawBytes)
  │ Encodes raw bytes → Base64 string
  │ Emits "UVCFrame" event to JS bridge
  ▼

JS / React Native Layer
────────────────────────
uvcCamera.ts → onFrame(base64)
  │
preprocessing.ts → parseY16Frame(base64)
  │ Decodes Base64 → Uint8Array
  │ Reads pairs of bytes as little-endian uint16 (Y16 format)
  │ Converts raw value → °C:  temp = (raw - 27315) / 100
  │ Output: number[][] [120 rows × 160 cols] in °C
  ▼
getMatrixStats(matrix)
  │ Computes min, max, mean temperatures
  ▼
live-feed.tsx — setMatrix(), setMinTemp(), setMaxTemp(), setMeanTemp()
  │
  ▼ (renders every frame)

View Mode Selector (Original | Otsu | Chan-Vese | Canny)
  │
  ├── Original
  │     ThermalMap.tsx
  │       Normalizes each pixel: (temp - min) / (max - min)
  │       Maps normalized value → iron colormap RGB
  │       Renders as SVG Rect grid (160×120 cells)
  │
  ├── Otsu Thresholding
  │     imageProcessing.ts → otsuThreshold(matrix)
  │       1. Normalize matrix → grayscale [0–255]
  │       2. Build 256-bin histogram
  │       3. Sweep thresholds 0→255:
  │            compute between-class variance = wB × wF × (mB - mF)²
  │       4. Pick threshold with maximum variance
  │       5. Output: BinaryMatrix (true = warm/foot, false = background)
  │     ProcessedThermalView.tsx
  │       Renders: white = foot region, black = background
  │
  ├── Chan-Vese Segmentation
  │     imageProcessing.ts → chanVese(matrix, 50 iterations)
  │       1. Normalize matrix → float [0–1]
  │       2. Initialize level set φ as 5×5 checkerboard
  │       3. For each iteration:
  │            c1 = mean of pixels where φ = true  (inside/foot)
  │            c2 = mean of pixels where φ = false (outside/background)
  │            Re-assign: φ[r][c] = (v - c1)² < (v - c2)²
  │       4. Output: BinaryMatrix (true = foot region)
  │     ProcessedThermalView.tsx
  │       Renders: teal = foot region, dark = background
  │
  └── Canny Edge Detector
        imageProcessing.ts → cannyEdges(matrix)
          1. Normalize → grayscale [0–255]
          2. Gaussian blur (5×5 kernel, σ≈1.4) — noise suppression
          3. Sobel operator (3×3) — compute gradient magnitude + direction
          4. Non-maximum suppression — thin edges to 1px width
          5. Double threshold:
               strong edges: magnitude ≥ maxMag × 0.15
               weak edges:   magnitude ≥ maxMag × 0.05
          6. Hysteresis: keep weak edges connected to strong edges
          7. Output: BinaryMatrix (true = edge pixel)
        ProcessedThermalView.tsx
          Renders: yellow = edge, black = non-edge

  │
  ▼ (user positions foot within guide overlay, then taps Capture)

Bilateral Capture
─────────────────
handleCapture() — Left Foot
  │ Freezes current matrix
  │ getImageB64(matrix) → thermalMatrixToPngB64() → Base64 PNG
  │ thermalStore.captureLeft(matrix, imageB64)
  │ captureStep → "right"
  ▼
handleCapture() — Right Foot
  │ thermalStore.captureRight(matrix, imageB64)
  │ thermalStore.capture("bilateral")
  │ capturedRef = true (freezes live feed)
  ▼

→ Continue → Clinical Data → Submit for AI Analysis
  (see shared path below)
```

---

## Flow 2 — File Upload (Thermal Image + CSV)

```
User taps "or import from files"
────────────────────────────────

Path A: Import Thermal Image (JPG/PNG)
  DocumentPicker.getDocumentAsync({ type: image/* })
    │ Returns file URI
    │ setImportImageUri(uri), setImportImageName(name)
    │
    │ NOTE: Importing an image alone does NOT create a matrix.
    │ The matrix shown in the viewer still comes from the live camera.
    │ The image is only used as the visual (imageB64) sent to the DPN API.
    ▼
  Matrix source = live camera frame (if connected)
  Image source  = imported file (read as Base64 on capture)

Path B: Import Temperature CSV
  DocumentPicker.getDocumentAsync({ type: text/* })
    │ Reads file content as text
    │
  preprocessing.ts → parseCsvMatrix(content)
    │ Splits by newline → rows
    │ Splits each row by comma/tab → cells
    │ Parses each cell as float (°C)
    │ Skips non-numeric header rows
    │ Output: number[][] of any dimensions
    │
  getMatrixStats(parsed)
    │ Computes min, max, mean
    ▼
  setMatrix(parsed) — replaces live camera matrix
  setImportCsvName(name)

Path C: Import Both Image + CSV (recommended)
  Image → stored as importImageUri (visual for API)
  CSV  → parsed → matrix (temperatures for processing + API)

  ▼ (matrix now available from CSV)

View Mode Selector (same as Flow 1)
  │ All four modes (Original / Otsu / Chan-Vese / Canny) operate
  │ on the CSV-derived matrix — same algorithms, same output
  ▼

"Use as Left/Right Foot" CTA (appears when image OR CSV is loaded + matrix exists)
────────────────────────────────────────────────────────────────────────────────────
handleUseImport() — Left Foot
  │ getImageB64(matrix):
  │   if importImageUri → reads file as Base64
  │   else              → thermalMatrixToPngB64(matrix) (generates PNG from CSV data)
  │ thermalStore.captureLeft(matrix, imageB64)
  │ captureStep → "right"
  │ resetImport() — clears image/CSV state for next foot
  ▼
handleUseImport() — Right Foot
  │ Same as above for right foot
  │ thermalStore.captureRight(matrix, imageB64)
  │ thermalStore.capture("bilateral")
  ▼

→ Continue → Clinical Data → Submit for AI Analysis
  (see shared path below)
```

---

## Shared Path — Clinical Data → DPN API → Result

```
clinical-data.tsx
──────────────────
computeAngiosomes(leftMatrix, "left")   ← thesis proportions (60/40 height, 35/65 width)
computeAngiosomes(rightMatrix, "right") ← mirrored for right foot plantar view
  │ Displays MPA, LPA, MCA, LCA mean temperatures per foot
  │ (reference only — not sent to API as labeled zones)
  │
Patient Vitals form (all optional)
  │ If entered: validated against clinical thresholds
  │   Blood glucose: 30–600 mg/dL
  │   Systolic BP: 60–250 mmHg
  │   Diastolic BP: 30–150 mmHg
  │   Heart rate: 30–220 bpm
  │   HbA1c: 3.0–15.0%
  │
"Submit for AI Analysis"
  │ Creates screening_session in Supabase
  │ Inserts patient_vitals (nullable fields)
  │ Inserts thermal_captures
  ▼

assessment.tsx
───────────────
dpnStore.startScan({
  left_image_b64,    ← Base64 PNG (from camera or imported file)
  right_image_b64,   ← Base64 PNG (from camera or imported file)
  left_temperatures, ← number[][] matrix in °C
  right_temperatures ← number[][] matrix in °C
})
  │
  ├── Step 1: checkServerHealth()
  │     GET /health → if models not loaded, polls every 5s up to 60s
  │     Shows "Server Waking" state if needed
  │
  └── Step 2: POST /analyze
        Sends bilateral images + temperature matrices to DPN API
        60s timeout (AbortController)
  │
  ▼ (on HTTP 200)

dpn-result.tsx
───────────────
Displays:
  - DPN DETECTED / NO DPN DETECTED banner
  - Per-foot prediction cards
  - Temperature asymmetry with 2.2°C threshold flag
  - Diagnosis factors list
  - Clinical disclaimer

"Save to Cloud"
  │ Inserts to classification_results (Supabase)
  │ Updates screening_session.status → "completed"
  │ Clears thermalStore + sessionStore
  │ Routes back to live-feed with lastSessionId
  ▼
live-feed.tsx — shows last result panel (fetched from Supabase)
```

---

## Data at Each Stage

| Stage | Left data | Right data |
|-------|-----------|------------|
| After capture/import | `leftMatrix: number[][]` | `rightMatrix: number[][]` |
| After capture/import | `leftImageB64: string` | `rightImageB64: string` |
| Angiosome display | 4 region means (computed locally) | 4 region means (computed locally) |
| Sent to DPN API | `left_temperatures: number[][]` | `right_temperatures: number[][]` |
| Sent to DPN API | `left_image_b64: string` | `right_image_b64: string` |
| Saved to Supabase | `thermal_matrix` in `thermal_captures` | same |
| Result from API | `classification`, `confidence_score`, `angiosomes_flagged` | (bilateral — single result) |
