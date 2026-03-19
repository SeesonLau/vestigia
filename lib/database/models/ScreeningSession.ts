// lib/database/models/ScreeningSession.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';

export class ScreeningSession extends Model {
  static table = 'screening_sessions';

  static associations = {
    thermal_captures: { type: 'has_many' as const, foreignKey: 'session_id' },
    patient_vitals: { type: 'has_many' as const, foreignKey: 'session_id' },
  };

  @field('supabase_id') supabaseId!: string | null;
  @field('patient_id') patientId!: string;
  @field('operator_id') operatorId!: string;
  @field('device_id') deviceId!: string | null;
  @field('clinic_id') clinicId!: string;
  @field('status') status!: string;
  @field('ambient_temperature_c') ambientTemperatureC!: number | null;
  @field('room_humidity_pct') roomHumidityPct!: number | null;
  @field('notes') notes!: string | null;
  @field('app_version') appVersion!: string | null;
  @field('synced') synced!: boolean;
  @readonly @date('started_at') startedAt!: Date;
  @date('completed_at') completedAt!: Date | null;

  @children('thermal_captures') thermalCaptures!: any;
  @children('patient_vitals') patientVitals!: any;
}
