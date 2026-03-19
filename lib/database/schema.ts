// lib/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const localSchema = appSchema({
  version: 1,
  tables: [
    //Patients
    tableSchema({
      name: 'patients',
      columns: [
        { name: 'supabase_id', type: 'string', isOptional: true },
        { name: 'clinic_id', type: 'string' },
        { name: 'patient_code', type: 'string' },
        { name: 'date_of_birth', type: 'string', isOptional: true },
        { name: 'sex', type: 'string', isOptional: true },
        { name: 'diabetes_type', type: 'string', isOptional: true },
        { name: 'diabetes_duration_years', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    //ScreeningSessions
    tableSchema({
      name: 'screening_sessions',
      columns: [
        { name: 'supabase_id', type: 'string', isOptional: true },
        { name: 'patient_id', type: 'string' },
        { name: 'operator_id', type: 'string' },
        { name: 'device_id', type: 'string', isOptional: true },
        { name: 'clinic_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'ambient_temperature_c', type: 'number', isOptional: true },
        { name: 'room_humidity_pct', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'app_version', type: 'string', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'started_at', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
      ],
    }),

    //ThermalCaptures
    tableSchema({
      name: 'thermal_captures',
      columns: [
        { name: 'supabase_id', type: 'string', isOptional: true },
        { name: 'session_id', type: 'string' },
        { name: 'foot', type: 'string' },
        { name: 'thermal_matrix', type: 'string' },
        { name: 'min_temp_c', type: 'number' },
        { name: 'max_temp_c', type: 'number' },
        { name: 'mean_temp_c', type: 'number' },
        { name: 'resolution_x', type: 'number' },
        { name: 'resolution_y', type: 'number' },
        { name: 'mpa_mean_c', type: 'number', isOptional: true },
        { name: 'lpa_mean_c', type: 'number', isOptional: true },
        { name: 'mca_mean_c', type: 'number', isOptional: true },
        { name: 'lca_mean_c', type: 'number', isOptional: true },
        { name: 'tci', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'captured_at', type: 'number' },
      ],
    }),

    //PatientVitals
    tableSchema({
      name: 'patient_vitals',
      columns: [
        { name: 'supabase_id', type: 'string', isOptional: true },
        { name: 'session_id', type: 'string' },
        { name: 'blood_glucose_mgdl', type: 'number', isOptional: true },
        { name: 'systolic_bp_mmhg', type: 'number', isOptional: true },
        { name: 'diastolic_bp_mmhg', type: 'number', isOptional: true },
        { name: 'heart_rate_bpm', type: 'number', isOptional: true },
        { name: 'hba1c_pct', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'recorded_at', type: 'number' },
      ],
    }),
  ],
});
