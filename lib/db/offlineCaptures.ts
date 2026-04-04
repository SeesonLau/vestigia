// lib/db/offlineCaptures.ts
import { getDb } from './localDb'
import type { LocalCapture } from '../../types'

//Save
export async function saveCapture(
  capture: Omit<LocalCapture, 'synced' | 'synced_at' | 'supabase_session_id'>
): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO local_captures
      (id, patient_label, foot_side, thermal_matrix_b64,
       min_temp, max_temp, mean_temp,
       blood_glucose_mgdl, systolic_bp_mmhg, diastolic_bp_mmhg,
       captured_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      capture.id,
      capture.patient_label,
      capture.foot_side,
      capture.thermal_matrix_b64,
      capture.min_temp,
      capture.max_temp,
      capture.mean_temp,
      capture.blood_glucose_mgdl ?? null,
      capture.systolic_bp_mmhg ?? null,
      capture.diastolic_bp_mmhg ?? null,
      capture.captured_at,
    ]
  )
}

//Read all
export async function getAllCaptures(): Promise<LocalCapture[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<RawRow>(
    'SELECT * FROM local_captures ORDER BY captured_at DESC'
  )
  return rows.map(toCapture)
}

//Read unsynced only
export async function getUnsyncedCaptures(): Promise<LocalCapture[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<RawRow>(
    'SELECT * FROM local_captures WHERE synced = 0 ORDER BY captured_at DESC'
  )
  return rows.map(toCapture)
}

//Mark synced
export async function markSynced(id: string, supabaseSessionId: string): Promise<void> {
  const db = await getDb()
  // Guard: only update if not already synced (prevents duplicate sync)
  await db.runAsync(
    `UPDATE local_captures
     SET synced = 1, synced_at = ?, supabase_session_id = ?
     WHERE id = ? AND synced = 0`,
    [new Date().toISOString(), supabaseSessionId, id]
  )
}

//Delete
export async function deleteCapture(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM local_captures WHERE id = ?', [id])
}

//Internal row type
interface RawRow {
  id: string
  patient_label: string
  foot_side: string
  thermal_matrix_b64: string
  min_temp: number
  max_temp: number
  mean_temp: number
  blood_glucose_mgdl: number | null
  systolic_bp_mmhg: number | null
  diastolic_bp_mmhg: number | null
  captured_at: string
  synced: number
  synced_at: string | null
  supabase_session_id: string | null
}

function toCapture(row: RawRow): LocalCapture {
  return {
    id: row.id,
    patient_label: row.patient_label,
    foot_side: row.foot_side as LocalCapture['foot_side'],
    thermal_matrix_b64: row.thermal_matrix_b64,
    min_temp: row.min_temp,
    max_temp: row.max_temp,
    mean_temp: row.mean_temp,
    blood_glucose_mgdl: row.blood_glucose_mgdl ?? undefined,
    systolic_bp_mmhg: row.systolic_bp_mmhg ?? undefined,
    diastolic_bp_mmhg: row.diastolic_bp_mmhg ?? undefined,
    captured_at: row.captured_at,
    synced: row.synced === 1,
    synced_at: row.synced_at ?? undefined,
    supabase_session_id: row.supabase_session_id ?? undefined,
  }
}
