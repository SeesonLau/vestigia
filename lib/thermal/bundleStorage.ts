// lib/thermal/bundleStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface BundlePatient {
  first_name:  string
  middle_name: string
  last_name:   string
  gender:      string
  birthdate:   string  // ISO YYYY-MM-DD
  weight_kg:   number
  height_cm:   number
}

export interface FootData {
  image_filename: string
  csv_filename:   string
  image_b64:      string
  csv_content:    string
  stats:          { min: number; max: number; mean: number }
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

export async function saveBundle(
  patient:    BundlePatient,
  leftRaw:    { image_b64: string; csv_content: string; stats: { min: number; max: number; mean: number } },
  rightRaw:   { image_b64: string; csv_content: string; stats: { min: number; max: number; mean: number } },
  capturedAt: string,
): Promise<ThermalBundle> {
  const bundle_code = generateBundleCode(patient.last_name, capturedAt)

  const bundle: ThermalBundle = {
    bundle_code,
    captured_at: capturedAt,
    synced: false,
    patient,
    left: {
      image_filename: `${bundle_code}_L_img.png`,
      csv_filename:   `${bundle_code}_L_csv.csv`,
      ...leftRaw,
    },
    right: {
      image_filename: `${bundle_code}_R_img.png`,
      csv_filename:   `${bundle_code}_R_csv.csv`,
      ...rightRaw,
    },
  }

  await AsyncStorage.setItem(BUNDLE_KEY(bundle_code), JSON.stringify(bundle))

  let index: string[] = []
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY)
    if (raw) index = JSON.parse(raw)
  } catch {}
  if (!index.includes(bundle_code)) index.unshift(bundle_code)
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index))

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
