// lib/database/models/PatientVitals.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { ScreeningSession } from './ScreeningSession';

export class PatientVitals extends Model {
  static table = 'patient_vitals';

  static associations = {
    screening_sessions: { type: 'belongs_to' as const, key: 'session_id' },
  };

  @field('supabase_id') supabaseId!: string | null;
  @field('session_id') sessionId!: string;
  @field('blood_glucose_mgdl') bloodGlucoseMgdl!: number | null;
  @field('systolic_bp_mmhg') systolicBpMmhg!: number | null;
  @field('diastolic_bp_mmhg') diastolicBpMmhg!: number | null;
  @field('heart_rate_bpm') heartRateBpm!: number | null;
  @field('hba1c_pct') hba1cPct!: number | null;
  @field('synced') synced!: boolean;
  @readonly @date('recorded_at') recordedAt!: Date;

  @relation('screening_sessions', 'session_id') session!: ScreeningSession;
}
