// lib/thermal/uvcCamera.ts
import { NativeModules, NativeEventEmitter, EmitterSubscription, Platform, PermissionsAndroid } from 'react-native'

const { UVCCamera } = NativeModules

if (!UVCCamera) {
  console.warn('UVCCamera native module not found. Run the app via `expo run:android`, not Expo Go.')
}

const emitter = UVCCamera ? new NativeEventEmitter(UVCCamera) : null

//Types
export type FrameCallback = (base64Frame: string) => void
export type DisplayFrameCallback = (jpegB64: string) => void

// Display mode: raw = linear grayscale (full range), agc = percentile-clipped grayscale, rgb = palette
export type DisplayMode = 'raw' | 'agc' | 'rgb'

// Available color palettes for RGB display mode. "medical" is the default
// (renamed from the legacy "rainbow3" 8-step LUT).
export type PaletteType =
  | 'medical'
  | 'ironbow'
  | 'rainbow'
  | 'white_hot'

export type CameraStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

//State
let frameSubscription: EmitterSubscription | null = null
let displaySubscription: EmitterSubscription | null = null
let connectSubscription: EmitterSubscription | null = null
let disconnectSubscription: EmitterSubscription | null = null
let formatsSubscription: EmitterSubscription | null = null

//Connect
export async function connectCamera(): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('UVC camera is only supported on Android.')
  }
  if (!UVCCamera) {
    throw new Error('UVCCamera native module not available. Use expo run:android.')
  }
  // CAMERA permission required on Samsung/Android for libusb to claim USB interface (SELinux)
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera Permission Required',
    message: 'Needed to access the thermal camera via USB.',
    buttonPositive: 'Allow',
  })
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Camera permission denied. Please allow camera access and try again.')
  }
  await UVCCamera.connect()
}

//Disconnect
export async function disconnectCamera(): Promise<void> {
  if (!UVCCamera) return
  displaySubscription?.remove()
  displaySubscription = null
  frameSubscription?.remove()
  frameSubscription = null
  await UVCCamera.disconnect()
}

//isConnected
export async function isCameraConnected(): Promise<boolean> {
  if (!UVCCamera) return false
  return UVCCamera.isConnected()
}

// Display frame listener — Kotlin-rendered JPEG (Y16 → palette → JPEG)
// JS receives a color/grayscale image ready for <Image>; never sees raw Y16.
export function onDisplayFrame(callback: DisplayFrameCallback): () => void {
  if (!emitter) return () => {}
  displaySubscription?.remove()
  displaySubscription = emitter.addListener('onDisplayFrame', callback)
  return () => {
    displaySubscription?.remove()
    displaySubscription = null
  }
}

//Raw Y16 frame listener (kept for compatibility; not used in main display flow)
export function onFrame(callback: FrameCallback): () => void {
  if (!emitter) return () => {}
  frameSubscription?.remove()
  frameSubscription = emitter.addListener('onFrame', callback)
  return () => {
    frameSubscription?.remove()
    frameSubscription = null
  }
}

//Connection state listeners
export function onCameraConnected(callback: () => void): () => void {
  if (!emitter) return () => {}
  connectSubscription?.remove()
  connectSubscription = emitter.addListener('onCameraConnected', callback)
  return () => {
    connectSubscription?.remove()
    connectSubscription = null
  }
}

export function onCameraDisconnected(callback: () => void): () => void {
  if (!emitter) return () => {}
  disconnectSubscription?.remove()
  disconnectSubscription = emitter.addListener('onCameraDisconnected', callback)
  return () => {
    disconnectSubscription?.remove()
    disconnectSubscription = null
  }
}

//Format info — fires once after connect with supported sizes JSON string
export function onCameraFormats(callback: (formatsJson: string) => void): () => void {
  if (!emitter) return () => {}
  formatsSubscription?.remove()
  formatsSubscription = emitter.addListener('onCameraFormats', callback)
  return () => {
    formatsSubscription?.remove()
    formatsSubscription = null
  }
}

//Query supported formats from a connected camera (async, returns JSON string)
export async function getSupportedFormats(): Promise<string> {
  if (!UVCCamera) return ''
  try { return await UVCCamera.getSupportedFormats() } catch { return '' }
}

// Set format preference before connecting. Takes effect on next nativeOpen.
export type CameraFormat = 'auto' | 'uyvy' | 'y16'
export async function setFormatPreference(format: CameraFormat): Promise<void> {
  if (!UVCCamera) return
  try { await UVCCamera.setFormatPreference(format) } catch {}
}

// Switch the live display mode (raw / agc / rgb). Safe to call while streaming.
export async function setDisplayMode(mode: DisplayMode): Promise<void> {
  if (!UVCCamera) return
  try { await UVCCamera.setDisplayMode(mode) } catch {}
}

// Set the active palette for RGB display mode. Safe to call while streaming.
export async function setPalette(palette: PaletteType): Promise<void> {
  if (!UVCCamera) return
  try { await UVCCamera.setPalette(palette) } catch {}
}

// Toggle the live preview between Raw and Enhanced regimes. Safe to call
// mid-stream. true = full pipeline (median + EMA + CLAHE + 320x240 upscale +
// unsharp). false = Y16 -> palette -> JPEG at native 160x120, no filtering.
export async function setLiveProcessing(enhanced: boolean): Promise<void> {
  if (!UVCCamera) return
  try { await UVCCamera.setLiveProcessing(enhanced) } catch {}
}

// Apply emissivity / reflected-temperature correction to every decoded
// frame (live preview AND capture artifacts). emissivity is clamped to
// [0.10, 1.00]; reflectedTempC to [-50, 150] °C. Default values 0.98 / 22°C
// are reasonable for diabetic foot screening (skin against clinic ambient).
export interface MeasurementParams { emissivity: number; reflectedTempC: number }
export async function setMeasurementParams(params: MeasurementParams): Promise<MeasurementParams | null> {
  if (!UVCCamera) return null
  try { return (await UVCCamera.setMeasurementParams(params.emissivity, params.reflectedTempC)) as MeasurementParams } catch { return null }
}

// Pause display processing — stops emitting onDisplayFrame events (stream data still buffered).
export async function pauseCamera(): Promise<void> {
  if (!UVCCamera) return
  try { await UVCCamera.pauseCamera() } catch {}
}

// Resume display processing after pauseCamera().
export async function resumeCamera(): Promise<void> {
  if (!UVCCamera) return
  try { await UVCCamera.resumeCamera() } catch {}
}

// processCapture — temporal average + median filter + foot isolation + TIFF/CSV encode on a Kotlin thread.
// Does NOT auto-save to device; call savePngToDevice / saveCsvToDevice with the final bundle filename.
// Bundle artifacts are always 3 slots:
//   [1] grayscale unprocessed, [2] palette processed, [3] isolated.

export interface NativeProcessResult {
  slot1ImageB64:    string         // PNG, always present
  slot2ImageB64:    string | null  // PNG; null only when processed slot was skipped
  slot3ImageB64:    string         // PNG (isolated), always present
  tiffB64:          string         // 16-bit TIFF (radiometric, Kelvin×100, native sensor res)
  csvContent:       string         // full-frame CSV (°C, 2 dp) at the working resolution
  maskedCsvContent: string         // foot-only CSV — background cells = "0.00"
  frameCount:       number
  width:            number         // working width (320 when enhanced, 160 raw)
  height:           number         // working height (240 when enhanced, 120 raw)
  minTemp:          number
  maxTemp:          number
  meanTemp:         number
  log:              string[]
}

/** Optional foot-frame ROI passed to the native processor. Coordinates are
 *  normalized [0..1] over the sensor matrix. When provided, slot [2] (in
 *  unprocessed mode also slot [1]) and slot [3] are cropped to this rect. */
export interface NativeCropRoi { x: number; y: number; w: number; h: number }

/** Optional capture-time options forwarded to the native processor. */
export interface NativeCaptureOptions {
  crop?: NativeCropRoi | null
  /** Background fill for the isolated PNG. Default 'transparent'. */
  isolatedBg?: 'transparent' | 'black'
  /** Capture regime. false (default) = native 160x120 raw artifacts;
   *  true = bilinear upscale to 320x240 + full processing pipeline. */
  enhanced?: boolean
}

export async function processCapture(opts?: NativeCaptureOptions | null): Promise<NativeProcessResult> {
  if (!UVCCamera) throw new Error('UVCCamera native module not available. Use expo run:android.')
  const params = {
    crop: opts?.crop ?? null,
    isolatedBg: opts?.isolatedBg ?? 'transparent',
    enhanced: opts?.enhanced ?? false,
  }
  return UVCCamera.processCapture(params) as Promise<NativeProcessResult>
}


// Save a base64-encoded PNG to Pictures/Vestigia on device storage.
export async function savePngToDevice(filename: string, base64Png: string): Promise<string> {
  if (!UVCCamera) throw new Error('UVCCamera native module not available.')
  return UVCCamera.savePngToDevice(filename, base64Png) as Promise<string>
}

// Save CSV text to Downloads/Vestigia on device storage.
export async function saveCsvToDevice(filename: string, csvContent: string): Promise<string> {
  if (!UVCCamera) throw new Error('UVCCamera native module not available.')
  return UVCCamera.saveCsvToDevice(filename, csvContent) as Promise<string>
}

//Frame readiness stats — emitted by Kotlin per display frame alongside onDisplayFrame
export interface FrameStats {
  variance:   number   // spatial variance of temps (°C²) — low = FFC or no subject
  frameDiff:  number   // mean absolute diff from previous frame (°C) — high = motion
  frameIndex: number   // total frames received since connect
  // Hottest / coldest pixel coordinates (normalized 0..1 over the sensor
  // matrix) and their temperatures. Plus the frame mean. Used to drive the
  // on-screen crosshair overlay (Hottest / Coldest / All Three).
  hotX:       number
  hotY:       number
  hotTemp:    number
  coldX:      number
  coldY:      number
  coldTemp:   number
  meanTemp:   number
}

export function onFrameStats(callback: (stats: FrameStats) => void): () => void {
  if (!emitter) return () => {}
  const sub = emitter.addListener('onFrameStats', (raw: Record<string, number>) =>
    callback({
      variance:   raw.variance,
      frameDiff:  raw.frameDiff,
      frameIndex: raw.frameIndex,
      hotX:       raw.hotX,
      hotY:       raw.hotY,
      hotTemp:    raw.hotTemp,
      coldX:      raw.coldX,
      coldY:      raw.coldY,
      coldTemp:   raw.coldTemp,
      meanTemp:   raw.meanTemp,
    })
  )
  return () => sub.remove()
}
