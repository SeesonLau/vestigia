// lib/thermal/captureProcessor.ts
// Thin JS wrapper around the native Kotlin thermal processor.
// All heavy computation (averaging, median filter, CLAHE, bilinear upscale,
// foot isolation, TIFF/CSV encoding) runs on a Kotlin thread.
//
// The bundle is always three slots at 320×240:
//   [1] raw          — upscale + palette, matches the live feed exactly.
//   [2] processed    — 3×3 median + CLAHE + upscale + palette, cropped to
//                      the ROI when one was drawn (full frame otherwise).
//   [3] isolated     — foot mask on the processed temperatures, cropped.

import { processCapture as nativeProcess, type NativeCaptureOptions } from './uvcCamera'

export interface ProcessedCapture {
  slot1ImageUri:    string         // data:image/png;base64,...  raw, 320×240
  slot2ImageUri:    string         // data:image/png;base64,...  processed (+ cropped)
  slot3ImageUri:    string         // data:image/png;base64,...  isolated (+ cropped)
  tiffB64:          string         // 16-bit TIFF (radiometric, native sensor res)
  csvContent:       string         // full-frame CSV (°C, 2 dp) at 320×240
  maskedCsvContent: string         // foot-only CSV — background cells = "0.00"
  width:            number         // 320
  height:           number         // 240
  frameCount:       number
  stats: { min: number; max: number; mean: number }
  log:              string[]
}

export async function processFrames(opts?: NativeCaptureOptions | null): Promise<ProcessedCapture> {
  const r = await nativeProcess(opts)
  return {
    slot1ImageUri:   'data:image/png;base64,' + r.slot1ImageB64,
    slot2ImageUri:   'data:image/png;base64,' + r.slot2ImageB64,
    slot3ImageUri:   'data:image/png;base64,' + r.slot3ImageB64,
    tiffB64:         r.tiffB64,
    csvContent:      r.csvContent,
    maskedCsvContent:r.maskedCsvContent,
    width:           r.width,
    height:          r.height,
    frameCount:      r.frameCount,
    stats:           { min: r.minTemp, max: r.maxTemp, mean: r.meanTemp },
    log:             r.log,
  }
}
