// types/index.ts
// auth.ts
export type UserRole = "patient" | "clinic" | "admin";
export type Sex = "male" | "female" | "other";

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  full_name: string;        //DB-generated: first + ' ' + middle? + ' ' + last
  role: UserRole;
  patient_code?: string | null;
  sex?: Sex | null;
  date_of_birth?: string | null;   //YYYY-MM-DD
  contact_number?: string | null;
  clinic_id?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// session.ts
export type SessionStatus =
  | "draft"
  | "uploading"
  | "completed"
  | "failed"
  | "discarded";

export type CaptureMode = "clinical" | "patient_self" | "offline_guest";

export type FootSide = "left" | "right" | "bilateral";

export type DPNClassification = "POSITIVE" | "NEGATIVE" | "INCONCLUSIVE";

export interface AngiosomeTemps {
  mpa_mean_c?: number;
  lpa_mean_c?: number;
  mca_mean_c?: number;
  lca_mean_c?: number;
}

export interface ThermalCapture extends AngiosomeTemps {
  id: string;
  session_id: string;
  foot: "left" | "right";
  thermal_matrix: number[][];
  min_temp_c: number;
  max_temp_c: number;
  mean_temp_c: number;
  resolution_x?: number;
  resolution_y?: number;
  raw_image_path?: string | null;
  processed_image_path: string;
  isolated_image_path: string;
  csv_path?: string | null;
  captured_at: string;
}

export interface ClassificationResult {
  id: string;
  session_id: string;
  classification: DPNClassification;
  confidence_score: number;
  left_tci?: number | null;
  right_tci?: number | null;
  bilateral_tci?: number | null;
  max_asymmetry_c?: number | null;
  per_angiosome_asymmetry?: {
    mpa?: number; lpa?: number; mca?: number; lca?: number;
  } | null;
  angiosomes_flagged?: string[] | null;
  model_version: string;
  classified_at: string;
}

export interface ScreeningSession {
  id: string;
  bundle_code?: string | null;
  subject_profile_id?: string | null;
  patient_id?: string | null;
  clinic_id?: string | null;
  operator_id?: string | null;
  device_id?: string | null;
  capture_mode: CaptureMode;
  status: SessionStatus;
  patient_snapshot?: Record<string, unknown> | null;
  notes?: string | null;
  started_at: string;
  completed_at?: string | null;
  // joined
  classification?: ClassificationResult;
  captures?: ThermalCapture[];
}

// patient.ts
// Clinic-side clinical record. profile_id is NOT NULL post-redesign --
// every patients row links to an existing profile (no anonymous patients).
export interface Patient {
  id: string;
  clinic_id: string;
  profile_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  sex?: "male" | "female" | "other";
  date_of_birth?: string;
  contact_number?: string;
  diabetes_type?: string;
  diabetes_duration_years?: number;
  height_cm?: number;
  weight_kg?: number;
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
  captured_at: string           // ISO timestamp
  synced: boolean
  synced_at?: string
  supabase_session_id?: string  // Set after successful sync
}

export interface DataRequest {
  id: string
  from_profile_id: string
  to_profile_id: string
  session_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'revoked'
  requested_at: string
  responded_at?: string | null
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

export type CameraSource = "uvc" | "wifi";

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
}
