// lib/thermal/captureProcessor.ts
// Thin JS wrapper around the native Kotlin thermal processor.
// All heavy computation (averaging, median filter, TIFF encoding) runs on a Kotlin thread.

import { processCapture as nativeProcess } from './uvcCamera'

export interface ProcessedCapture {
  displayPngUri: string   // data:image/png;base64,... for <Image> display
  tiffB64:        string   // base64 TIFF (16-bit radiometric, Kelvin×100)
  csvContent:     string   // CSV text (°C per pixel, 2 dp)
  width:          number
  height:         number
  frameCount:     number
  stats: { min: number; max: number; mean: number }
  imageSaved:     string   // filename saved to Pictures/Vestigia
  csvSaved:       string   // filename saved to Downloads/Vestigia
  log:            string[]
}

// Delegates all processing and file saving to Kotlin (runs on a background thread).
// _frames is unused — Kotlin maintains its own rolling frame buffer.
export async function processFrames(_frames?: unknown[]): Promise<ProcessedCapture> {
  const r = await nativeProcess()
  return {
    displayPngUri: 'data:image/png;base64,' + r.displayPngB64,
    tiffB64:       r.tiffB64,
    csvContent:    r.csvContent,
    width:         r.width,
    height:        r.height,
    frameCount:    r.frameCount,
    stats: { min: r.minTemp, max: r.maxTemp, mean: r.meanTemp },
    imageSaved:    r.imageSaved,
    csvSaved:      r.csvSaved,
    log:           r.log,
  }
}
