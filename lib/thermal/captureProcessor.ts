// lib/thermal/captureProcessor.ts
// Thin JS wrapper around the native Kotlin thermal processor.
// All heavy computation (averaging, median filter, optional bilinear upscale,
// isolation, TIFF/CSV encoding) runs on a Kotlin thread.

import { processCapture as nativeProcess, type NativeCaptureOptions } from './uvcCamera'

// Bundle artifacts as a 3-slot pipeline. The slot layout is symmetric across
// modes — only the underlying matrix differs:
//   [1] palette full frame   (always present)
//   [2] palette cropped      (null when no ROI was drawn)
//   [3] isolated foot, cropped to ROI when one is set
// feedMode mirrors the live-feed Raw/Enhanced toggle:
//   feedMode='unprocessed' -> Raw, native 160x120 unenhanced matrix
//   feedMode='processed'   -> Enhanced, 320x240 with CLAHE + unsharp + emissivity
// The bundle viewer uses feed_mode to render "RAW" vs "ENHANCED" labels.
export type FeedMode = 'unprocessed' | 'processed'

export interface ProcessedCapture {
  slot1ImageUri:    string         // data:image/png;base64,...  full frame
  slot2ImageUri:    string | null  // data:image/png;base64,...  cropped, null if no ROI
  slot3ImageUri:    string         // data:image/png;base64,...  isolated
  feedMode:         FeedMode
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
  // Trust the native side's feedMode (now derived from the `enhanced` flag).
  // Falls back to 'unprocessed' only if the native build is older than the
  // pipeline-symmetry change.
  const nativeFeedMode = (r.feedMode === 'processed' ? 'processed' : 'unprocessed') as FeedMode

  return {
    slot1ImageUri:   'data:image/png;base64,' + r.slot1ImageB64,
    slot2ImageUri:   r.slot2ImageB64 ? ('data:image/png;base64,' + r.slot2ImageB64) : null,
    slot3ImageUri:   'data:image/png;base64,' + r.slot3ImageB64,
    feedMode:        nativeFeedMode,
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
