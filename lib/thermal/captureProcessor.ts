// lib/thermal/captureProcessor.ts
// Thin JS wrapper around the native Kotlin thermal processor.
// All heavy computation (averaging, median filter, optional bilinear upscale,
// isolation, TIFF/CSV encoding) runs on a Kotlin thread.

import { processCapture as nativeProcess, type NativeCaptureOptions } from './uvcCamera'

// Bundle artifacts as a 3-slot pipeline:
//   [1] grayscale unprocessed, [2] palette processed, [3] isolated.
// In Enhanced capture mode every slot is upscaled to 320x240; in Raw mode
// the slots stay at the sensor's native 160x120.
export interface ProcessedCapture {
  slot1ImageUri:    string         // data:image/png;base64,...  unprocessed
  slot2ImageUri:    string | null  // data:image/png;base64,...  processed (always present today)
  slot3ImageUri:    string         // data:image/png;base64,...  isolated
  /** DB column tag. Currently fixed to 'unprocessed' since the user-facing
   *  feed-mode toggle was collapsed into the Raw/Enhanced switch. Kept as a
   *  field so downstream insert code stays untouched. */
  feedMode:         'unprocessed'
  tiffB64:          string         // 16-bit TIFF (radiometric, native sensor res)
  csvContent:       string         // full-frame CSV (°C, 2 dp) at working resolution
  maskedCsvContent: string         // foot-only CSV — background cells = "0.00"
  width:            number         // 320 when enhanced, 160 when raw
  height:           number         // 240 when enhanced, 120 when raw
  frameCount:       number
  stats: { min: number; max: number; mean: number }
  log:              string[]
}

export async function processFrames(opts?: NativeCaptureOptions | null): Promise<ProcessedCapture> {
  const r = await nativeProcess(opts)

  return {
    slot1ImageUri:   'data:image/png;base64,' + r.slot1ImageB64,
    slot2ImageUri:   r.slot2ImageB64 ? ('data:image/png;base64,' + r.slot2ImageB64) : null,
    slot3ImageUri:   'data:image/png;base64,' + r.slot3ImageB64,
    feedMode:        'unprocessed',
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
