// data/mockData.ts
//
// Single source of truth for ALL dummy data used during UI development.
// Hardcoded accounts are defined here. When Supabase is integrated later,
// the auth layer (store/authStore.ts) will check credentials here FIRST
// for the dev accounts, and fall through to Supabase for real accounts.
//
// TO ADD MORE DUMMY ACCOUNTS: add an entry to MOCK_ACCOUNTS and
// corresponding profile/data entries below.

import { AuthUser, ClassificationResult, ScreeningSession } from "../types";

// ── Hardcoded dev accounts ─────────────────────────────────────
export const MOCK_ACCOUNTS: Record<
  string,
  { password: string; userId: string }
> = {
  "clinic@email.com": { password: "12345678", userId: "mock-clinic-01" },
  "admin@email.com": { password: "12345678", userId: "mock-admin-01" },
  "patient@email.com": { password: "12345678", userId: "mock-patient-01" },
};

// ── Profiles ───────────────────────────────────────────────────
export const MOCK_PROFILES: Record<string, AuthUser> = {
  "mock-clinic-01": {
    id: "mock-clinic-01",
    email: "clinic@email.com",
    full_name: "Dr. Maria Santos",
    role: "clinic",
    clinic_id: "mock-clinic-c1",
    is_active: true,
  },
  "mock-admin-01": {
    id: "mock-admin-01",
    email: "admin@email.com",
    full_name: "System Administrator",
    role: "admin",
    is_active: true,
  },
  "mock-patient-01": {
    id: "mock-patient-01",
    email: "patient@email.com",
    full_name: "Juan dela Cruz",
    role: "patient",
    is_active: true,
  },
};

// ── Clinics ────────────────────────────────────────────────────
export const MOCK_CLINICS = [
  {
    id: "mock-clinic-c1",
    name: "Cebu City Health Center",
    facility_type: "hospital",
    sessions: 340,
    devices: 2,
    is_active: true,
  },
  {
    id: "mock-clinic-c2",
    name: "PHO Mandaue",
    facility_type: "clinic",
    sessions: 218,
    devices: 1,
    is_active: true,
  },
  {
    id: "mock-clinic-c3",
    name: "Barangay Punta Princesa BHS",
    facility_type: "barangay_health_station",
    sessions: 89,
    devices: 1,
    is_active: true,
  },
];

// ── Devices ────────────────────────────────────────────────────
export const MOCK_DEVICES = [
  {
    id: "mock-device-d1",
    device_code: "DPN-Scanner-01",
    clinic_id: "mock-clinic-c1",
    sensor_model: "MI0802M5S",
    firmware_version: "v2.1.4",
    last_calibration_date: "2025-02-10",
    is_active: true,
  },
  {
    id: "mock-device-d2",
    device_code: "DPN-Scanner-02",
    clinic_id: "mock-clinic-c1",
    sensor_model: "MI0802M5S",
    firmware_version: "v2.1.3",
    last_calibration_date: "2025-01-28",
    is_active: true,
  },
  {
    id: "mock-device-d3",
    device_code: "DPN-Scanner-03",
    clinic_id: "mock-clinic-c2",
    sensor_model: "MI0802M5S",
    firmware_version: "v2.0.9",
    last_calibration_date: "2025-01-15",
    is_active: true,
  },
];

// ── Patients ───────────────────────────────────────────────────
export const MOCK_PATIENTS = [
  {
    id: "mock-pat-p1",
    user_id: "mock-patient-01",
    clinic_id: "mock-clinic-c1",
    patient_code: "DPN-P-0001",
    date_of_birth: "1972-03-15",
    sex: "male",
    diabetes_type: "type2",
    diabetes_duration_years: 8,
  },
  {
    id: "mock-pat-p2",
    user_id: null,
    clinic_id: "mock-clinic-c1",
    patient_code: "DPN-P-0002",
    date_of_birth: "1968-07-22",
    sex: "female",
    diabetes_type: "type2",
    diabetes_duration_years: 12,
  },
  {
    id: "mock-pat-p3",
    user_id: null,
    clinic_id: "mock-clinic-c1",
    patient_code: "DPN-P-0003",
    date_of_birth: "1980-11-04",
    sex: "male",
    diabetes_type: "type1",
    diabetes_duration_years: 20,
  },
  {
    id: "mock-pat-p4",
    user_id: null,
    clinic_id: "mock-clinic-c2",
    patient_code: "DPN-P-0004",
    date_of_birth: "1975-05-30",
    sex: "female",
    diabetes_type: "type2",
    diabetes_duration_years: 5,
  },
  {
    id: "mock-pat-p5",
    user_id: null,
    clinic_id: "mock-clinic-c2",
    patient_code: "DPN-P-0005",
    date_of_birth: "1963-09-12",
    sex: "male",
    diabetes_type: "type2",
    diabetes_duration_years: 15,
  },
];

// ── Classification Results ─────────────────────────────────────
const mkResult = (
  sessionId: string,
  cls: "POSITIVE" | "NEGATIVE",
  confidence: number,
  mpa: number,
  lpa: number,
  mca: number,
  lca: number,
  date: string,
): ClassificationResult => ({
  id: `result-${sessionId}`,
  session_id: sessionId,
  classification: cls,
  confidence_score: confidence,
  asymmetry_mpa_c: mpa,
  asymmetry_lpa_c: lpa,
  asymmetry_mca_c: mca,
  asymmetry_lca_c: lca,
  max_asymmetry_c: Math.max(
    Math.abs(mpa),
    Math.abs(lpa),
    Math.abs(mca),
    Math.abs(lca),
  ),
  angiosomes_flagged: [
    Math.abs(mpa) > 2.2 ? "MPA" : null,
    Math.abs(lpa) > 2.2 ? "LPA" : null,
    Math.abs(mca) > 2.2 ? "MCA" : null,
    Math.abs(lca) > 2.2 ? "LCA" : null,
  ].filter(Boolean) as string[],
  bilateral_tci: parseFloat((Math.random() * 0.08 + 0.01).toFixed(3)),
  model_version: "dpn-v1.2.0",
  processing_time_ms: 1240,
  classified_at: date,
});

// ── Screening Sessions ─────────────────────────────────────────
// Clinic sessions (visible to clinic + admin)
export const MOCK_CLINIC_SESSIONS: ScreeningSession[] = [
  {
    id: "sess-01",
    patient_id: "mock-pat-p1",
    operator_id: "mock-clinic-01",
    device_id: "mock-device-d1",
    clinic_id: "mock-clinic-c1",
    status: "completed",
    started_at: "2025-02-20T09:15:00Z",
    completed_at: "2025-02-20T09:28:00Z",
    classification: mkResult(
      "sess-01",
      "POSITIVE",
      0.874,
      2.8,
      1.4,
      3.1,
      0.9,
      "2025-02-20T09:27:00Z",
    ),
  },
  {
    id: "sess-02",
    patient_id: "mock-pat-p2",
    operator_id: "mock-clinic-01",
    device_id: "mock-device-d1",
    clinic_id: "mock-clinic-c1",
    status: "completed",
    started_at: "2025-02-19T14:00:00Z",
    completed_at: "2025-02-19T14:12:00Z",
    classification: mkResult(
      "sess-02",
      "NEGATIVE",
      0.932,
      0.4,
      0.8,
      1.1,
      0.6,
      "2025-02-19T14:11:00Z",
    ),
  },
  {
    id: "sess-03",
    patient_id: "mock-pat-p3",
    operator_id: "mock-clinic-01",
    device_id: "mock-device-d1",
    clinic_id: "mock-clinic-c1",
    status: "completed",
    started_at: "2025-02-18T10:30:00Z",
    completed_at: "2025-02-18T10:45:00Z",
    classification: mkResult(
      "sess-03",
      "NEGATIVE",
      0.891,
      1.2,
      0.5,
      0.8,
      1.0,
      "2025-02-18T10:44:00Z",
    ),
  },
  {
    id: "sess-04",
    patient_id: "mock-pat-p4",
    operator_id: "mock-clinic-01",
    device_id: "mock-device-d1",
    clinic_id: "mock-clinic-c1",
    status: "completed",
    started_at: "2025-02-17T11:00:00Z",
    completed_at: "2025-02-17T11:14:00Z",
    classification: mkResult(
      "sess-04",
      "POSITIVE",
      0.761,
      2.5,
      2.9,
      1.8,
      0.7,
      "2025-02-17T11:13:00Z",
    ),
  },
  {
    id: "sess-05",
    patient_id: "mock-pat-p5",
    operator_id: "mock-clinic-01",
    device_id: "mock-device-d1",
    clinic_id: "mock-clinic-c1",
    status: "failed",
    started_at: "2025-02-16T08:00:00Z",
  },
  {
    id: "sess-06",
    patient_id: "mock-pat-p1",
    operator_id: "mock-clinic-01",
    device_id: "mock-device-d1",
    clinic_id: "mock-clinic-c1",
    status: "discarded",
    started_at: "2025-02-15T16:20:00Z",
  },
];

// Patient's own sessions (only their records)
export const MOCK_PATIENT_SESSIONS: ScreeningSession[] =
  MOCK_CLINIC_SESSIONS.filter((s) => s.patient_id === "mock-pat-p1");

// Admin sees all sessions across all clinics
export const MOCK_ALL_SESSIONS: ScreeningSession[] = MOCK_CLINIC_SESSIONS;

// ── Admin user list ────────────────────────────────────────────
export const MOCK_ALL_USERS = [
  {
    id: "mock-clinic-01",
    name: "Dr. Maria Santos",
    role: "clinic",
    clinic: "Cebu City Health Center",
    status: "active",
    email: "clinic@email.com",
  },
  {
    id: "mock-admin-01",
    name: "System Administrator",
    role: "admin",
    clinic: "—",
    status: "active",
    email: "admin@email.com",
  },
  {
    id: "mock-patient-01",
    name: "Juan dela Cruz",
    role: "patient",
    clinic: "—",
    status: "active",
    email: "patient@email.com",
  },
  {
    id: "user-04",
    name: "Dr. Ben Reyes",
    role: "clinic",
    clinic: "PHO Mandaue",
    status: "active",
    email: "ben.reyes@pho.gov.ph",
  },
  {
    id: "user-05",
    name: "Ana Lim",
    role: "patient",
    clinic: "—",
    status: "inactive",
    email: "ana.lim@example.com",
  },
];

// ── Admin stats ────────────────────────────────────────────────
export const MOCK_ADMIN_STATS = [
  { label: "Total Sessions", value: "1,284", change: "+12%", up: true },
  { label: "POSITIVE Cases", value: "342", change: "+8%", up: true },
  { label: "Active Clinics", value: "18", change: "+2", up: true },
  { label: "Registered Users", value: "94", change: "+5", up: true },
];

// ── Vitals per session ─────────────────────────────────────────
export const MOCK_VITALS: Record<
  string,
  {
    blood_glucose_mgdl: number;
    systolic_bp_mmhg: number;
    diastolic_bp_mmhg: number;
    heart_rate_bpm: number;
    hba1c_pct?: number;
  }
> = {
  "sess-01": {
    blood_glucose_mgdl: 185,
    systolic_bp_mmhg: 138,
    diastolic_bp_mmhg: 88,
    heart_rate_bpm: 78,
    hba1c_pct: 8.2,
  },
  "sess-02": {
    blood_glucose_mgdl: 142,
    systolic_bp_mmhg: 130,
    diastolic_bp_mmhg: 82,
    heart_rate_bpm: 72,
  },
  "sess-03": {
    blood_glucose_mgdl: 210,
    systolic_bp_mmhg: 145,
    diastolic_bp_mmhg: 90,
    heart_rate_bpm: 81,
    hba1c_pct: 9.1,
  },
  "sess-04": {
    blood_glucose_mgdl: 168,
    systolic_bp_mmhg: 128,
    diastolic_bp_mmhg: 80,
    heart_rate_bpm: 76,
  },
};
