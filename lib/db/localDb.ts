// lib/db/localDb.ts
import * as SQLite from 'expo-sqlite'

const DB_NAME = 'vestigia_local.db'
const SCHEMA_VERSION = 1

let _db: SQLite.SQLiteDatabase | null = null

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db
  _db = await SQLite.openDatabaseAsync(DB_NAME)
  await migrate(_db)
  return _db
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS db_version (
      version INTEGER NOT NULL
    );
  `)

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM db_version LIMIT 1'
  )
  const current = row?.version ?? 0

  if (current < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_captures (
        id                  TEXT PRIMARY KEY NOT NULL,
        patient_label       TEXT NOT NULL,
        foot_side           TEXT NOT NULL,
        thermal_matrix_b64  TEXT NOT NULL,
        min_temp            REAL NOT NULL,
        max_temp            REAL NOT NULL,
        mean_temp           REAL NOT NULL,
        blood_glucose_mgdl  REAL,
        systolic_bp_mmhg    REAL,
        diastolic_bp_mmhg   REAL,
        captured_at         TEXT NOT NULL,
        synced              INTEGER NOT NULL DEFAULT 0,
        synced_at           TEXT,
        supabase_session_id TEXT
      );
      INSERT INTO db_version (version) VALUES (${SCHEMA_VERSION});
    `)
  }
  // Future migrations: if (current < 2) { ... }
}

export function generateLocalId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `OFF-${date}-${rand}`
}
