// types/index.ts
// auth.ts
export type UserRole = "patient" | "clinic" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  clinic_id?: string;
  is_active: boolean;
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
  blood_glucose_mgdl?: number;
  systolic_bp_mmhg?: number;
  diastolic_bp_mmhg?: number;
  heart_rate_bpm?: number;
  hba1c_pct?: number;
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
  started_at: string;
  completed_at?: string;
  // joined
  classification?: ClassificationResult;
  captures?: ThermalCapture[];
  vitals?: PatientVitals;
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
