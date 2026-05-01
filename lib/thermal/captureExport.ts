// lib/thermal/captureExport.ts
// Saves pre-encoded TIFF and CSV data (produced by Kotlin) to a user-chosen directory.
// Uses expo-file-system Storage Access Framework — shows Android directory picker.

import * as FileSystem from 'expo-file-system'

const SAF = FileSystem.StorageAccessFramework

// Saves a base64-encoded TIFF file to a user-selected directory.
export async function saveTiff(tiffB64: string, label: string): Promise<string> {
  const { granted, directoryUri } = await SAF.requestDirectoryPermissionsAsync()
  if (!granted) throw new Error('Storage permission denied')

  const filename = `thermal_${label}_${Date.now()}.tiff`
  const fileUri  = await SAF.createFileAsync(directoryUri, filename, 'image/tiff')
  await SAF.writeAsStringAsync(fileUri, tiffB64, { encoding: FileSystem.EncodingType.Base64 })

  console.log(`[ThermalExport] TIFF saved: ${filename}`)
  return filename
}

// Saves CSV temperature data (°C) to a user-selected directory.
export async function exportCsv(csvContent: string, label: string): Promise<string> {
  const { granted, directoryUri } = await SAF.requestDirectoryPermissionsAsync()
  if (!granted) throw new Error('Storage permission denied')

  const filename = `thermal_${label}_${Date.now()}.csv`
  const fileUri  = await SAF.createFileAsync(directoryUri, filename, 'text/csv')
  await SAF.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 })

  console.log(`[ThermalExport] CSV saved: ${filename}`)
  return filename
}
