// lib/thermal/preprocessing.ts
// FR-506 — Thermal frame preprocessing for FLIR Lepton 3.5 via PureThermal Mini Pro
// Input: raw Y16 (RAW14) frames from UVC stream, encoded as base64
// Output: normalized matrix + foot region mask + AI API payload

//Types
export type ThermalMatrix = number[][]    // 160×120 raw 16-bit values (kelvin * 100)
export type NormalizedMatrix = number[][] // 160×120 values in [0, 1]
export type FootMask = boolean[][]        // true = foot pixel, false = background

export interface ThermalCapturePair {
  left: ThermalMatrix
  right: ThermalMatrix
}

export interface ApiPayload {
  left_matrix: NormalizedMatrix
  right_matrix: NormalizedMatrix
  left_mask: FootMask
  right_mask: FootMask
  frame_width: number
  frame_height: number
  ambient_temp_c: number
  session_id: string
  patient_code: string
}

//Constants
const FRAME_WIDTH = 160
const FRAME_HEIGHT = 120
const BYTES_PER_PIXEL = 2       // Y16 = 16-bit = 2 bytes per pixel
const EXPECTED_BYTES = FRAME_WIDTH * FRAME_HEIGHT * BYTES_PER_PIXEL // 38400

// Lepton 3.5 Y16/RAW14 temperature conversion:
// Raw value is in units of 0.01 kelvin. Subtract 27315 to get °C * 100, then divide by 100.
const KELVIN_OFFSET = 27315     // 273.15°C * 100

//Parse
// Decodes a base64 Y16 frame string into a 160×120 matrix of Celsius temperatures.
export function parseY16Frame(base64: string): ThermalMatrix {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  if (bytes.length < EXPECTED_BYTES) {
    throw new Error(`Frame too small: got ${bytes.length} bytes, expected ${EXPECTED_BYTES}`)
  }

  const matrix: ThermalMatrix = []
  for (let row = 0; row < FRAME_HEIGHT; row++) {
    const rowData: number[] = []
    for (let col = 0; col < FRAME_WIDTH; col++) {
      const idx = (row * FRAME_WIDTH + col) * BYTES_PER_PIXEL
      // Little-endian 16-bit value
      const raw = bytes[idx] | (bytes[idx + 1] << 8)
      const tempC = (raw - KELVIN_OFFSET) / 100
      rowData.push(tempC)
    }
    matrix.push(rowData)
  }
  return matrix
}

//Normalize
// Scales matrix values to [0, 1] using the matrix's own min/max.
// Pass explicit min/max if you want consistent scaling across frames.
export function normalizeMatrix(
  matrix: ThermalMatrix,
  minTemp?: number,
  maxTemp?: number
): NormalizedMatrix {
  const flat = matrix.flat()
  const min = minTemp ?? Math.min(...flat)
  const max = maxTemp ?? Math.max(...flat)
  const range = max - min || 1

  return matrix.map(row => row.map(val => (val - min) / range))
}

//Segment
// Returns a boolean mask where true = foot pixel.
// Foot pixels are those significantly warmer than ambient temperature.
// Threshold: ambient + 2°C (conservative — adjustable based on field testing).
export function segmentFootRegion(
  matrix: ThermalMatrix,
  ambientTempC: number,
  thresholdC: number = 2.0
): FootMask {
  const cutoff = ambientTempC + thresholdC
  return matrix.map(row => row.map(val => val >= cutoff))
}

//Stats
// Returns the min and max temperature from a matrix (useful for normalization).
export function getMatrixStats(matrix: ThermalMatrix): { min: number; max: number; mean: number } {
  const flat = matrix.flat()
  const min = Math.min(...flat)
  const max = Math.max(...flat)
  const mean = flat.reduce((a, b) => a + b, 0) / flat.length
  return { min, max, mean }
}

//CSV import
// Parses a CSV string (comma or tab-separated rows of float values) into a temperature matrix.
// Skips non-numeric header rows. Supports any dimensions.
export function parseCsvMatrix(csv: string): ThermalMatrix {
  const lines = csv.trim().split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) throw new Error("Empty CSV file")

  const matrix: ThermalMatrix = []
  for (const line of lines) {
    const cells = line.split(/[,\t]/).map(c => c.trim())
    const row = cells.map(c => parseFloat(c))
    if (row.some(isNaN) || row.length === 0) continue // skip header or malformed rows
    matrix.push(row)
  }
  if (matrix.length === 0) throw new Error("No numeric temperature data found in CSV")
  return matrix
}

// Encodes a matrix as base64 JSON for local SQLite storage (non-Y16 path).
export function matrixToStorageB64(matrix: ThermalMatrix): string {
  return btoa(JSON.stringify(matrix))
}

// Decodes a stored matrix — auto-detects JSON-encoded matrix vs raw Y16 frame.
export function parseStoredMatrix(b64: string): ThermalMatrix {
  try {
    const decoded = atob(b64)
    if (decoded.trimStart().startsWith('[[')) {
      return JSON.parse(decoded) as ThermalMatrix
    }
  } catch (_) {}
  return parseY16Frame(b64)
}

//Payload
// Packages preprocessed bilateral thermal data into the payload expected by the AI model API.
// Call this after parseY16Frame + normalizeMatrix + segmentFootRegion for both feet.
export function buildApiPayload(
  left: ThermalMatrix,
  right: ThermalMatrix,
  ambientTempC: number,
  sessionId: string,
  patientCode: string,
  minTemp?: number,
  maxTemp?: number
): ApiPayload {
  return {
    left_matrix: normalizeMatrix(left, minTemp, maxTemp),
    right_matrix: normalizeMatrix(right, minTemp, maxTemp),
    left_mask: segmentFootRegion(left, ambientTempC),
    right_mask: segmentFootRegion(right, ambientTempC),
    frame_width: FRAME_WIDTH,
    frame_height: FRAME_HEIGHT,
    ambient_temp_c: ambientTempC,
    session_id: sessionId,
    patient_code: patientCode,
  }
}
