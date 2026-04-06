// lib/thermal/bleCamera.ts
// Real BLE scanning + connection for Waveshare ESP32 MIO802M5S thermal cameras.
//
// ESP32 firmware must:
//   - Advertise with name prefix "ESP32-Thermal" (e.g. "ESP32-Thermal-01")
//   - Expose service:        BLE_SERVICE_UUID
//   - Characteristic (read): BLE_IP_CHAR_UUID  → UTF-8 string of WiFi IP, e.g. "192.168.4.1"
//   - Characteristic (read): BLE_INFO_CHAR_UUID → UTF-8 device info string (optional)
//
// Requires: npm install react-native-ble-plx   (+ expo run:android to rebuild)

import { PermissionsAndroid, Platform } from 'react-native'
import { BleManager, Device, State } from 'react-native-ble-plx'

// ── UUIDs (must match ESP32 firmware) ──────────────────────────────────────
export const BLE_SERVICE_UUID   = '0000ffe0-0000-1000-8000-00805f9b34fb'
export const BLE_IP_CHAR_UUID   = '0000ffe1-0000-1000-8000-00805f9b34fb'
export const BLE_INFO_CHAR_UUID = '0000ffe2-0000-1000-8000-00805f9b34fb'

const DEVICE_NAME_PREFIX = 'ESP32-Thermal'

export type BleScanResult = {
  id: string
  name: string
  rssi: number
}

//Manager singleton
let _manager: BleManager | null = null

function getManager(): BleManager {
  if (!_manager) _manager = new BleManager()
  return _manager
}

//Permissions
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  const sdk = typeof Platform.Version === 'string'
    ? parseInt(Platform.Version, 10)
    : Platform.Version

  if (sdk >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ])
    return Object.values(results).every(
      (r) => r === PermissionsAndroid.RESULTS.GRANTED,
    )
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  )
  return result === PermissionsAndroid.RESULTS.GRANTED
}

//Scan
export function scanBle(
  onDevice: (device: BleScanResult) => void,
  onError: (message: string) => void,
  timeoutMs = 12000,
): () => void {
  const mgr = getManager()
  const seen = new Set<string>()
  let stopped = false

  const stateSub = mgr.onStateChange((state) => {
    if (stopped) return
    if (state === State.PoweredOn) {
      stateSub.remove()
      mgr.startDeviceScan(
        null,
        { allowDuplicates: false },
        (err, device: Device | null) => {
          if (err) { onError(err.message); return }
          if (!device) return
          const name = device.name ?? device.localName ?? ''
          if (!name.startsWith(DEVICE_NAME_PREFIX)) return
          if (seen.has(device.id)) return
          seen.add(device.id)
          onDevice({ id: device.id, name, rssi: device.rssi ?? -100 })
        },
      )
    } else if (state === State.PoweredOff) {
      onError('Bluetooth is off. Enable it and try again.')
    } else if (state === State.Unauthorized) {
      onError('Bluetooth permission denied. Allow it in app settings.')
    }
  }, true)

  const timer = setTimeout(() => {
    if (!stopped) mgr.stopDeviceScan()
  }, timeoutMs)

  return () => {
    stopped = true
    clearTimeout(timer)
    stateSub.remove()
    mgr.stopDeviceScan()
  }
}

export function stopBleScan(): void {
  _manager?.stopDeviceScan()
}

//Connect — returns WiFi IP read from BLE characteristic, or null if unavailable
export async function connectBle(deviceId: string): Promise<string | null> {
  const mgr = getManager()
  const device = await mgr.connectToDevice(deviceId)
  await device.discoverAllServicesAndCharacteristics()
  try {
    const char = await device.readCharacteristicForService(
      BLE_SERVICE_UUID,
      BLE_IP_CHAR_UUID,
    )
    if (char.value) {
      // char.value is base64 — decode to UTF-8 IP string like "192.168.4.1"
      return atob(char.value).trim()
    }
  } catch {
    // Characteristic not present — device doesn't expose IP via BLE.
    // User must enter IP manually.
  }
  return null
}

export async function disconnectBle(deviceId: string): Promise<void> {
  try { await _manager?.cancelDeviceConnection(deviceId) } catch {}
}

export function destroyBleManager(): void {
  _manager?.destroy()
  _manager = null
}
