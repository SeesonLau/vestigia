// types/index.ts
// auth.ts
export type UserRole = "patient" | "clinic" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  clinic_id?: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// session.ts
export type SessionStatus =
  | "pending"
  | "capturing"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "discarded";

export type FootSide = "left" | "right" | "bilateral";

export type DPNClassification = "POSITIVE" | "NEGATIVE";

export interface PatientVitals {
  id?: string;
  session_id?: string;
  blood_glucose_mgdl?: number;
  systolic_bp_mmhg?: number;
  diastolic_bp_mmhg?: number;
  heart_rate_bpm?: number;
  hba1c_pct?: number;
  recorded_at?: string;
}

export interface AngiosomeTemps {
  mpa_mean_c?: number;
  lpa_mean_c?: number;
  mca_mean_c?: number;
  lca_mean_c?: number;
  tci?: number;
}

export interface ThermalCapture extends AngiosomeTemps {
  id: string;
  session_id: string;
  foot: FootSide;
  thermal_matrix: number[][];
  min_temp_c: number;
  max_temp_c: number;
  mean_temp_c: number;
  resolution_x?: number;
  resolution_y?: number;
  captured_at: string;
}

export interface ClassificationResult {
  id: string;
  session_id: string;
  classification: DPNClassification;
  confidence_score: number;
  asymmetry_mpa_c?: number;
  asymmetry_lpa_c?: number;
  asymmetry_mca_c?: number;
  asymmetry_lca_c?: number;
  max_asymmetry_c?: number;
  angiosomes_flagged?: string[];
  bilateral_tci?: number;
  risk_level?: "LOW" | "MEDIUM" | "HIGH";
  feature_vector?: Record<string, number>;
  model_version: string;
  classified_at: string;
  processing_time_ms?: number;
}

export interface ScreeningSession {
  id: string;
  patient_id: string;
  operator_id: string;
  device_id: string;
  clinic_id: string;
  status: SessionStatus;
  ambient_temperature_c?: number;
  room_humidity_pct?: number;
  notes?: string;
  app_version?: string;
  started_at: string;
  completed_at?: string;
  // joined
  classification?: ClassificationResult;
  captures?: ThermalCapture[];
  vitals?: PatientVitals;
}

// patient.ts
export interface Patient {
  id: string;
  user_id?: string;
  clinic_id: string;
  patient_code: string;
  date_of_birth?: string;
  sex?: "male" | "female" | "other";
  diabetes_type?: "type1" | "type2" | "gestational" | "unknown";
  diabetes_duration_years?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// offline.ts
export interface LocalCapture {
  id: string                    // Format: OFF-YYYYMMDD-XXXX
  patient_label: string         // Free-text label entered at capture time
  foot_side: FootSide
  thermal_matrix_b64: string    // Base64-encoded raw Y16 bytes (~38KB)
  min_temp: number
  max_temp: number
  mean_temp: number
  blood_glucose_mgdl?: number
  systolic_bp_mmhg?: number
  diastolic_bp_mmhg?: number
  captured_at: string           // ISO timestamp
  synced: boolean
  synced_at?: string
  supabase_session_id?: string  // Set after successful sync
}

export interface DataRequest {
  id: string
  from_role: 'clinic' | 'patient'
  from_id: string
  to_role: 'clinic' | 'patient'
  to_id: string
  session_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  from_profile?: { full_name: string; email: string }
  session?: ScreeningSession
}

// device.ts
export type ConnectionStatus =
  | "disconnected"
  | "scanning"
  | "connecting"
  | "connected"
  | "error";

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
}
