// lib/thermal/captureProcessor.ts
// Thin JS wrapper around the native Kotlin thermal processor.
// All heavy computation (averaging, median filter, isolation, TIFF encoding) runs on a Kotlin thread.

import { processCapture as nativeProcess } from './uvcCamera'

export interface ProcessedCapture {
  rawImageUri:     string   // JPEG snapshot taken before processing (live display frame)
  displayPngUri:   string   // data:image/png;base64,... — processed palette image
  isolatedPngUri:  string   // data:image/png;base64,... — RGBA PNG, foot only, transparent bg
  tiffB64:         string   // base64 TIFF (16-bit radiometric, Kelvin×100)
  csvContent:      string   // full-frame CSV (°C, 2 dp)
  maskedCsvContent:string   // foot-only CSV — background cells = "0.00"
  width:           number
  height:          number
  frameCount:      number
  stats: { min: number; max: number; mean: number }
  log:             string[]
}

export async function processFrames(rawImageUri: string): Promise<ProcessedCapture> {
  const r = await nativeProcess()

  return {
    rawImageUri,
    displayPngUri:    'data:image/png;base64,' + r.displayPngB64,
    isolatedPngUri:   'data:image/png;base64,' + r.isolatedPngB64,
    tiffB64:          r.tiffB64,
    csvContent:       r.csvContent,
    maskedCsvContent: r.maskedCsvContent,
    width:            r.width,
    height:           r.height,
    frameCount:       r.frameCount,
    stats:            { min: r.minTemp, max: r.maxTemp, mean: r.meanTemp },
    log:              r.log,
  }
}
