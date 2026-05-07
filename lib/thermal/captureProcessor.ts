// lib/thermal/captureProcessor.ts
// Thin JS wrapper around the native Kotlin thermal processor.
// All heavy computation (averaging, median filter, optional bilinear upscale,
// isolation, TIFF/CSV encoding) runs on a Kotlin thread.

import { processCapture as nativeProcess, type FeedMode, type NativeCaptureOptions } from './uvcCamera'

// 3-slot pipeline. Slot content depends on feedMode:
//   'unprocessed' -> [1] grayscale unprocessed, [2] palette processed, [3] isolated
//   'processed'   -> [1] palette processed full-frame, [2] palette processed cropped
//                    to ROI (null when no ROI), [3] isolated
export interface ProcessedCapture {
  slot1ImageUri:   string         // data:image/png;base64,... — slot [1]
  slot2ImageUri:   string | null  // null only in 'processed' feed mode with no ROI
  slot3ImageUri:   string         // data:image/png;base64,... — slot [3] isolated
  feedMode:        FeedMode
  tiffB64:         string         // 16-bit TIFF (radiometric, native sensor res)
  csvContent:      string         // full-frame CSV (°C, 2 dp) at working resolution
  maskedCsvContent:string         // foot-only CSV — background cells = "0.00"
  width:           number         // 320 when upscaled, 160 when native
  height:          number         // 240 when upscaled, 120 when native
  frameCount:      number
  stats: { min: number; max: number; mean: number }
  log:             string[]
}

export async function processFrames(opts?: NativeCaptureOptions | null): Promise<ProcessedCapture> {
  const r = await nativeProcess(opts)

  return {
    slot1ImageUri:   'data:image/png;base64,' + r.slot1ImageB64,
    slot2ImageUri:   r.slot2ImageB64 ? ('data:image/png;base64,' + r.slot2ImageB64) : null,
    slot3ImageUri:   'data:image/png;base64,' + r.slot3ImageB64,
    feedMode:        r.feedMode,
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
