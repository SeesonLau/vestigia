// lib/thermal/uvcCamera.ts
import { NativeModules, NativeEventEmitter, EmitterSubscription, Platform } from 'react-native'

const { UVCCamera } = NativeModules

if (!UVCCamera) {
  console.warn('UVCCamera native module not found. Run the app via `expo run:android`, not Expo Go.')
}

const emitter = UVCCamera ? new NativeEventEmitter(UVCCamera) : null

//Types
export type FrameCallback = (base64Frame: string) => void

export type CameraStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

//State
let frameSubscription: EmitterSubscription | null = null
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
  await UVCCamera.connect()
}

//Disconnect
export async function disconnectCamera(): Promise<void> {
  if (!UVCCamera) return
  frameSubscription?.remove()
  frameSubscription = null
  await UVCCamera.disconnect()
}

//isConnected
export async function isCameraConnected(): Promise<boolean> {
  if (!UVCCamera) return false
  return UVCCamera.isConnected()
}

//Frame listener
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
