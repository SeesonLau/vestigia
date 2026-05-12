// lib/thermal/bundleStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { savePngToDevice, saveCsvToDevice } from './uvcCamera'

export interface BundlePatient {
  first_name:  string
  middle_name: string
  last_name:   string
  gender:      string
  birthdate:   string  // ISO YYYY-MM-DD
  weight_kg:   number
  height_cm:   number
}

// Every saved bundle ships three slots at 320×240:
//   raw       — palette frame, matches the live preview (no enhancement)
//   processed — 3×3 median + CLAHE + upscale + palette, cropped to ROI when
//               one was drawn (otherwise the full frame)
//   isolated  — foot mask cropped to the same ROI
export interface FootData {
  raw_filename:       string
  processed_filename: string
  isolated_filename:  string
  csv_filename:       string
  raw_image_b64:      string         // slot 1: raw 320×240
  processed_image_b64:string         // slot 2: post-processed (+ cropped to ROI)
  isolated_image_b64: string         // slot 3: isolated (+ cropped to ROI)
  csv_content:        string         // masked CSV (background = "0.00")
  stats:              { min: number; max: number; mean: number }
}

export interface ThermalBundle {
  bundle_code: string
  captured_at: string
  synced:      boolean
  patient:     BundlePatient
  left:        FootData
  right:       FootData
}

const BUNDLE_KEY = (code: string) => `bundle:${code}`
const INDEX_KEY  = 'bundles_index'

function generateBundleCode(lastName: string, capturedAt: string): string {
  const initial = lastName.trim()[0]?.toUpperCase() ?? 'X'
  const d  = new Date(capturedAt)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${initial}_${yy}${mm}${dd}-${hh}${mi}`
}

interface FootInput {
  raw_image_b64:       string
  processed_image_b64: string | null   // accepts null for forwards-compat;
                                       // coalesced to "" if a caller passes it
  isolated_image_b64:  string
  csv_content:         string
  stats:               { min: number; max: number; mean: number }
}

export async function saveBundle(
  patient:    BundlePatient,
  leftInput:  FootInput,
  rightInput: FootInput,
  capturedAt: string,
): Promise<ThermalBundle> {
  const bundle_code = generateBundleCode(patient.last_name, capturedAt)
  const code = bundle_code

  const leftFoot: FootData = {
    raw_filename:        `${code}_L_raw.png`,
    processed_filename:  `${code}_L_processed.png`,
    isolated_filename:   `${code}_L_isolated.png`,
    csv_filename:        `${code}_L_csv.csv`,
    raw_image_b64:       leftInput.raw_image_b64,
    processed_image_b64: leftInput.processed_image_b64 ?? "",
    isolated_image_b64:  leftInput.isolated_image_b64,
    csv_content:         leftInput.csv_content,
    stats:               leftInput.stats,
  }

  const rightFoot: FootData = {
    raw_filename:        `${code}_R_raw.png`,
    processed_filename:  `${code}_R_processed.png`,
    isolated_filename:   `${code}_R_isolated.png`,
    csv_filename:        `${code}_R_csv.csv`,
    raw_image_b64:       rightInput.raw_image_b64,
    processed_image_b64: rightInput.processed_image_b64 ?? "",
    isolated_image_b64:  rightInput.isolated_image_b64,
    csv_content:         rightInput.csv_content,
    stats:               rightInput.stats,
  }

  const bundle: ThermalBundle = {
    bundle_code: code,
    captured_at: capturedAt,
    synced: false,
    patient,
    left:  leftFoot,
    right: rightFoot,
  }

  // Save to AsyncStorage first — device saves are best-effort
  await AsyncStorage.setItem(BUNDLE_KEY(code), JSON.stringify(bundle))

  let index: string[] = []
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY)
    if (raw) index = JSON.parse(raw)
  } catch {}
  if (!index.includes(code)) index.unshift(code)
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index))

  // Save images and CSV to device storage with bundle-code filenames.
  const saves: Promise<unknown>[] = [
    leftFoot.processed_image_b64
      ? savePngToDevice(leftFoot.processed_filename, leftFoot.processed_image_b64).catch(() => {})
      : Promise.resolve(),
    savePngToDevice(leftFoot.isolated_filename,   leftFoot.isolated_image_b64).catch(() => {}),
    saveCsvToDevice(leftFoot.csv_filename,        leftFoot.csv_content).catch(() => {}),
    rightFoot.processed_image_b64
      ? savePngToDevice(rightFoot.processed_filename, rightFoot.processed_image_b64).catch(() => {})
      : Promise.resolve(),
    savePngToDevice(rightFoot.isolated_filename,  rightFoot.isolated_image_b64).catch(() => {}),
    saveCsvToDevice(rightFoot.csv_filename,       rightFoot.csv_content).catch(() => {}),
  ]
  await Promise.all(saves)

  return bundle
}

export async function getAllBundles(): Promise<ThermalBundle[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const index: string[] = JSON.parse(raw)
    const results = await Promise.all(
      index.map(async (code) => {
        try {
          const item = await AsyncStorage.getItem(BUNDLE_KEY(code))
          return item ? (JSON.parse(item) as ThermalBundle) : null
        } catch { return null }
      })
    )
    return results.filter(Boolean) as ThermalBundle[]
  } catch { return [] }
}

export async function getBundleByCode(code: string): Promise<ThermalBundle | null> {
  try {
    const raw = await AsyncStorage.getItem(BUNDLE_KEY(code))
    return raw ? (JSON.parse(raw) as ThermalBundle) : null
  } catch { return null }
}

export async function markBundleSynced(code: string): Promise<void> {
  const bundle = await getBundleByCode(code)
  if (!bundle) return
  await AsyncStorage.setItem(BUNDLE_KEY(code), JSON.stringify({ ...bundle, synced: true }))
}
