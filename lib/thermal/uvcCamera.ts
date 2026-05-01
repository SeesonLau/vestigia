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

// Available color palettes for RGB display mode
export type PaletteType =
  | 'ironbow'
  | 'rainbow'
  | 'rainbow_hc'
  | 'white_hot'
  | 'black_hot'
  | 'arctic'
  | 'sepia'

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

// processCapture — temporal average + median filter + TIFF/CSV encode on a Kotlin thread.
// Auto-saves PNG to Pictures/Vestigia and CSV to Downloads/Vestigia via MediaStore.
export interface NativeProcessResult {
  displayPngB64: string  // base64 PNG (current palette / display mode)
  tiffB64:        string  // base64 TIFF (16-bit radiometric, Kelvin×100)
  csvContent:     string  // CSV text rows (°C per pixel, 2 decimal places)
  frameCount:     number
  width:          number
  height:         number
  minTemp:        number
  maxTemp:        number
  meanTemp:       number
  imageSaved:     string  // filename saved to Pictures/Vestigia
  csvSaved:       string  // filename saved to Downloads/Vestigia
  log:            string[]
}

export async function processCapture(): Promise<NativeProcessResult> {
  if (!UVCCamera) throw new Error('UVCCamera native module not available. Use expo run:android.')
  return UVCCamera.processCapture() as Promise<NativeProcessResult>
}
